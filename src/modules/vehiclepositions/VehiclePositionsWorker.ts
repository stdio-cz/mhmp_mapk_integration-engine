"use strict";

import { CustomError } from "@golemio/errors";
import { RopidGTFS, VehiclePositions } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import { config } from "../../core/config";
import { log } from "../../core/helpers";
import { PostgresModel, RedisModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { RopidGTFSTripsModel } from "../ropidgtfs";
import {
    VehiclePositionsLastPositionsModel,
    VehiclePositionsPositionsModel,
    VehiclePositionsTransformation,
    VehiclePositionsTripsModel,
} from "./";

import * as turf from "@turf/turf";
import * as cheapruler from "cheap-ruler";
import * as _ from "lodash";
import * as moment from "moment-timezone";
import * as Sequelize from "sequelize";
const ruler: any = cheapruler(50);
// const rulerGpsDistance = {
//     latDiff: - 50 + ruler.destination([14.5, 50], 0.6, 0)[1],
//     lngDiff: - 14.5 + ruler.destination([14.5, 50], 0.6, 90)[0],
// };
const gtfsRealtime = require("gtfs-realtime-bindings").transit_realtime;

export class VehiclePositionsWorker extends BaseWorker {

    private modelPositions: VehiclePositionsPositionsModel;
    private modelStops: PostgresModel;
    private modelTrips: VehiclePositionsTripsModel;
    private modelLastPositions: VehiclePositionsLastPositionsModel;
    private transformation: VehiclePositionsTransformation;
    private delayComputationTripsModel: RedisModel;
    private gtfsRtModel: RedisModel;
    private queuePrefix: string;

    constructor() {
        super();
        this.modelPositions = new VehiclePositionsPositionsModel();
        this.modelStops = new PostgresModel(VehiclePositions.stops.name + "Model",
            {
                outputSequelizeAttributes: VehiclePositions.stops.outputSequelizeAttributes,
                pgTableName: VehiclePositions.stops.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(VehiclePositions.stops.name + "ModelValidator",
                VehiclePositions.stops.outputMongooseSchemaObject),
        );
        this.modelTrips = new VehiclePositionsTripsModel();
        this.modelLastPositions = new VehiclePositionsLastPositionsModel();
        this.transformation = new VehiclePositionsTransformation();
        this.delayComputationTripsModel = new RedisModel(RopidGTFS.delayComputationTrips.name + "Model", {
            decodeDataAfterGet: JSON.parse,
            encodeDataBeforeSave: JSON.stringify,
            isKeyConstructedFromData: true,
            prefix: RopidGTFS.delayComputationTrips.mongoCollectionName,
        },
            new Validator(RopidGTFS.delayComputationTrips.name + "ModelValidator",
                RopidGTFS.delayComputationTrips.outputMongooseSchemaObject));
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + VehiclePositions.name.toLowerCase();
        this.gtfsRtModel = new RedisModel("GTFSRealTimeModel", {
            isKeyConstructedFromData: false,
            prefix: "files",
        }, null);

        this.modelTrips.associate(this.modelLastPositions.sequelizeModel);
    }

    public saveDataToDB = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString()).m.spoj;

        const transformedData = await this.transformation.transform(inputData);

        // positions saving
        await this.modelPositions.save(transformedData.positions);
        // trips saving
        const rows = await this.modelTrips.saveBySqlFunction(
            transformedData.trips,
            ["id"],
        );

        // send message for update GTFSTripIds
        for (let i = 0, chunkSize = 50; i < rows.inserted.length; i += chunkSize) {
            await this.sendMessageToExchange(
                "workers." + this.queuePrefix + ".updateGTFSTripId",
                JSON.stringify(rows.inserted.slice(i, i + chunkSize)),
            );
        }

        // send message for update delay
        for (let i = 0, chunkSize = 200; i < rows.updated.length; i += chunkSize) {
            await this.sendMessageToExchange(
                "workers." + this.queuePrefix + ".updateDelay",
                JSON.stringify(rows.updated.slice(i, i + chunkSize)),
            );
        }
    }

    public saveStopsToDB = async (msg: any): Promise<void> => {
        let transformedData: any;
        try {
            const inputData = JSON.parse(msg.content.toString()).m.spoj;
            transformedData = (await this.transformation.transform(inputData)).stops;
        } catch (err) {
            // back compatibility
            transformedData = JSON.parse(msg.content.toString());
        }
        await this.modelStops.saveBySqlFunction(transformedData, ["cis_stop_sequence", "trips_id"]);
    }

    public updateGTFSTripId = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const promiseValues = await Promise.all(
            inputData.map(async (trip) => {
                try {
                    const result = await this.modelTrips.findGTFSTripId(trip);
                    await this.modelTrips.update(result, {
                        where: {
                            id: trip.id,
                        },
                    });
                    return Promise.resolve(trip.id);
                } catch (err) {
                    return Promise.resolve(err);
                }
            }),
        );

        const foundedTripsPromiseValues = promiseValues.filter((result) => !(result instanceof CustomError));
        for (let i = 0, chunkSize = 100; i < foundedTripsPromiseValues.length; i += chunkSize) {
            await this.sendMessageToExchange("workers." + this.queuePrefix + ".updateDelay",
                JSON.stringify(foundedTripsPromiseValues.slice(i, i + chunkSize)),
            );
        }

        // TODO - do we need Error loging? Should by valid that sometimes no GTFS is given - To be moved into alerts.
        // promiseValues.filter((result) => (result instanceof CustomError)).forEach(async (err) => {
        //     throw new CustomError(`Error while updating gtfs_trip_id.`, true, this.constructor.name, 5001, err);
        // });
    }

    public generateGtfsRt = async (msg: any): Promise<void> => {

        const results = await this.modelTrips.findAll({
            include: [{
                as: "last_position",
                model: this.modelLastPositions.sequelizeModel,
                where: {
                    tracking: 2,
                },
            }],
            raw: true,
            where: {
                gtfs_trip_id: { [Sequelize.Op.ne]: null },
            },
        });

        const updatesMessage = gtfsRealtime.FeedMessage.create();
        const positionsMessage = gtfsRealtime.FeedMessage.create();
        const header = {
            gtfsRealtimeVersion: "2.0",
            incrementality: "FULL_DATASET",
            timestamp: Math.round(new Date().valueOf() / 1000),
        };
        updatesMessage.header = gtfsRealtime.FeedHeader.fromObject(header);
        positionsMessage.header = gtfsRealtime.FeedHeader.fromObject(header);

        results.forEach((r: any) => {
            const tripDescriptor = {
                scheduleRelationship: r.is_canceled ? "CANCELED" : "SCHEDULED",
                startDate: moment(r.timestamp).utc().format("YYYYMMDD"),
                startTime: r.origin_time,
                tripId: r.gtfs_trip_id,
            };
            const entityTimestamp = Math.round(r["last_position.origin_timestamp"] / 1000);

            const updateEntity = {
                id: r.id,
                tripUpdate: {
                    stopTimeUpdate: [
                        {
                            arrival: r["last_position.delay_stop_arrival"] === null ? null : {
                                delay: r["last_position.delay_stop_arrival"],
                            },
                            departure: r["last_position.delay_stop_departure"] === null ? null : {
                                delay: r["last_position.delay_stop_departure"],
                            },
                            stopSequence: r["last_position.cis_last_stop_sequence"],
                        },
                    ],
                    timestamp: entityTimestamp,
                    trip: tripDescriptor,
                },
            };
            const positionEntity = {
                id: r.gtfs_trip_id,
                vehicle: {
                    currentStopSequence: r["last_position.cis_last_stop_sequence"],
                    position: {
                        bearing: r["last_position.bearing"],
                        latitude: r["last_position.lat"],
                        longitude: r["last_position.lon"],
                        speed: (r["last_position.speed"] / 3.6).toFixed(2),
                    },
                    timestamp: entityTimestamp,
                    trip: tripDescriptor,
                },
            };

            updatesMessage.entity.push(gtfsRealtime.FeedEntity.fromObject(updateEntity));
            positionsMessage.entity.push(gtfsRealtime.FeedEntity.fromObject(positionEntity));
        });

        if (gtfsRealtime.FeedMessage.verify(updatesMessage) === null) {
            const buffer = gtfsRealtime.FeedMessage.encode(updatesMessage).finish();

            // save to Redis
            await this.gtfsRtModel.save("trip_updates.pb", buffer.toString("hex"));
            // await fs.writeFile("trip_updates.pb", buffer); // debug
            await this.gtfsRtModel.save("trip_updates.json", JSON.stringify(updatesMessage));
        }

        if (gtfsRealtime.FeedMessage.verify(positionsMessage) === null) {
            const buffer = gtfsRealtime.FeedMessage.encode(positionsMessage).finish();

            // save to Redis
            await this.gtfsRtModel.save("vehicle_positions.pb", buffer.toString("hex"));
            // await fs.writeFile("vehicle_positions.pb", buffer); // debug
            await this.gtfsRtModel.save("vehicle_positions.json", JSON.stringify(updatesMessage));
        }
    }

    public computePositions = async (tripPositions: any): Promise<any> => {
        const startTimestamp = parseInt(tripPositions.start_timestamp, 10);
        let startDayTimestamp = moment.utc(startTimestamp).tz("Europe/Prague").startOf("day").valueOf();

        // if trip has 24+ stop times set real startDay to yesterday
        const stopTimeDayOverflow =
            Math.floor(tripPositions.gtfsData.shape_points[0].time_scheduled_seconds / (60 * 60 * 24));
        if (stopTimeDayOverflow > 0) {
            startDayTimestamp -= stopTimeDayOverflow * 60 * 60 * 24 * 1000;
        }

        const updatePositionsIterator = (i: number, options: any, cb: () => any): void => {
            if (i === tripPositions.positions.length) {
                return cb();
            }
            const position = tripPositions.positions[i];

            if (position.tracking === 2) {
                if (position.delay === null) {
                    const currentPosition = {
                        geometry: {
                            coordinates: [parseFloat(position.lng), parseFloat(position.lat)],
                            type: "Point",
                        },
                        properties: {
                            origin_time: position.origin_time,
                            origin_timestamp: position.origin_timestamp,
                        },
                        type: "Feature",
                    };
                    const lastPosition = (options.lastPositionTracking !== null)
                        ? {
                            geometry: {
                                coordinates: options.lastPositionTracking.coordinates,
                                type: "Point",
                            },
                            properties: {
                                time_delay: options.lastPositionTracking.delay,
                            },
                            type: "Feature",
                        }
                        : null;

                    // CORE processing
                    this.getEstimatedPoint(
                        tripPositions.gtfsData.shape_points, currentPosition, lastPosition,
                        startDayTimestamp,
                    ).then((estimatedPoint) => {
                        if (estimatedPoint.properties.time_delay !== undefined
                            && estimatedPoint.properties.time_delay !== null) {

                            const positionUpdate = {
                                bearing: (position.bearing !== undefined) ?
                                    position.bearing : estimatedPoint.properties.bearing,
                                delay: estimatedPoint.properties.time_delay,
                                id: position.id,
                                last_stop_arrival_time: estimatedPoint.properties.last_stop_arrival_time,
                                last_stop_departure_time: estimatedPoint.properties.last_stop_departure_time,
                                last_stop_id: estimatedPoint.properties.last_stop_id,
                                last_stop_sequence: estimatedPoint.properties.last_stop_sequence,
                                next_stop_arrival_time: estimatedPoint.properties.next_stop_arrival_time,
                                next_stop_departure_time: estimatedPoint.properties.next_stop_departure_time,
                                next_stop_id: estimatedPoint.properties.next_stop_id,
                                next_stop_sequence: estimatedPoint.properties.next_stop_sequence,
                                shape_dist_traveled: estimatedPoint.properties.shape_dist_traveled,
                                tracking: position.tracking,
                                trips_id: tripPositions.trips_id,
                            };
                            options.lastPositionTracking = {
                                ...positionUpdate,
                                coordinates: estimatedPoint.geometry.coordinates,
                            };
                            options.positions.push(positionUpdate);
                        }
                        // NEXT
                        setImmediate(updatePositionsIterator.bind(null, i + 1, options, cb));
                    });

                } else {
                    options.lastPositionTracking = {
                        ...position,
                        coordinates: [parseFloat(position.lng), parseFloat(position.lat)],
                    };
                    // NEXT
                    setImmediate(updatePositionsIterator.bind(null, i + 1, options, cb));
                }
            } else if (position.tracking === 0 && position.shape_dist_traveled === null) {
                if (options.lastPositionTracking === null) {
                    let doNotTrack = false;
                    // For DPP PRAHA we need filter all buses which are not close to first/last stop (.5km)
                    // and still not tracking (except those with time in range of theirs trip stop times)
                    if (tripPositions.agency_name_scheduled === "DP PRAHA") {
                        if (position.origin_timestamp < (startTimestamp - 1 * 60 * 1000)) {
                            if (
                                true
                                // rulerGpsDistance.latDiff <=
                                //     Math.abs(position.lat - tripPositions.gtfsData.shape_points[0].coordinates[1])
                                // &&
                                // rulerGpsDistance.lngDiff <=
                                //     Math.abs(position.lng - tripPositions.gtfsData.shape_points[0].coordinates[0])
                            ) {
                                const distanceFromFirstStop = ruler.distance(
                                    [position.lng, position.lat],
                                    tripPositions.gtfsData.shape_points[0].coordinates,
                                );
                                if (distanceFromFirstStop > .5) {
                                    doNotTrack = true;
                                }
                            }
                        }
                    }

                    const positionUpdate = {
                        bearing: (position.bearing !== undefined) ? position.bearing : null,
                        delay: null,
                        id: position.id,
                        last_stop_arrival_time: null,
                        last_stop_departure_time: null,
                        last_stop_id: null,
                        last_stop_sequence: null,
                        next_stop_arrival_time: startDayTimestamp
                            + tripPositions.gtfsData.shape_points[0].time_scheduled_seconds * 1000,
                        next_stop_departure_time: startDayTimestamp
                            + tripPositions.gtfsData.shape_points[0].time_scheduled_seconds * 1000,
                        next_stop_id: tripPositions.gtfsData.shape_points[0].last_stop,
                        next_stop_sequence: tripPositions.gtfsData.shape_points[0].last_stop_sequence,
                        shape_dist_traveled: tripPositions.gtfsData.shape_points[0].shape_dist_traveled,
                        tracking: doNotTrack ? -1 : position.tracking,
                        trips_id: tripPositions.trips_id,
                    };
                    options.positions.push(positionUpdate);
                } else {
                    const lastShapePointsIndex = tripPositions.gtfsData.shape_points.length - 1;
                    let doNotTrack = false;
                    // For DPP PRAHA we need filter all buses which are not close to first/last stop (.5km)
                    // and still not tracking (except those with time in range of theirs trip stop times)
                    if (tripPositions.agency_name_scheduled === "DP PRAHA") {
                        if (
                            true
                            // rulerGpsDistance.latDiff <=
                            //     Math.abs(position.lat - tripPositions.gtfsData.shape_points[0].coordinates[1])
                            // &&
                            // rulerGpsDistance.lngDiff <=
                            //     Math.abs(position.lng - tripPositions.gtfsData.shape_points[0].coordinates[0])
                        ) {
                            const distanceFromLastStop = ruler.distance(
                                [position.lng, position.lat],
                                tripPositions.gtfsData.shape_points[lastShapePointsIndex].coordinates,
                            );
                            if (distanceFromLastStop > .5) {
                                doNotTrack = true;
                            }
                        }
                    }

                    const positionUpdate = {
                        bearing: (position.bearing !== undefined) ? position.bearing : null,
                        delay: null,
                        id: position.id,
                        last_stop_arrival_time: startDayTimestamp
                            + tripPositions.gtfsData.shape_points[lastShapePointsIndex]
                                .time_scheduled_seconds * 1000,
                        last_stop_departure_time: startDayTimestamp
                            + tripPositions.gtfsData.shape_points[lastShapePointsIndex]
                                .time_scheduled_seconds * 1000,
                        last_stop_id: tripPositions.gtfsData.shape_points[lastShapePointsIndex].next_stop,
                        last_stop_sequence: tripPositions.gtfsData.shape_points[lastShapePointsIndex]
                            .next_stop_sequence,
                        next_stop_arrival_time: null,
                        next_stop_departure_time: null,
                        next_stop_id: null,
                        next_stop_sequence: null,
                        shape_dist_traveled: tripPositions.gtfsData.shape_points[lastShapePointsIndex]
                            .shape_dist_traveled,
                        tracking: doNotTrack ? -1 : position.tracking,
                        trips_id: tripPositions.trips_id,
                    };
                    options.positions.push(positionUpdate);
                }
                // NEXT
                setImmediate(updatePositionsIterator.bind(null, i + 1, options, cb));
            } else {
                // NEXT
                setImmediate(updatePositionsIterator.bind(null, i + 1, options, cb));
            }
        };
        return new Promise<any>((resolve, reject) => {
            const options = {
                lastPositionTracking: null,
                positions: [],
            };
            updatePositionsIterator(0, options, () => {
                resolve(options.positions);
            });
        });
    }

    public updateDelay = async (msg: any): Promise<void> => {
        try {
            const tripIds = JSON.parse(msg.content.toString());

            // Get all positions for each trip
            const tripsPositionsToUpdate = await this.modelPositions.getPositionsForUdpateDelay(tripIds);

            // Append gtfs data to each trip
            const promisesGetGTFSData = tripsPositionsToUpdate.map(async (trip, i) => {
                const gtfsData = await this.delayComputationTripsModel.getData(trip.gtfs_trip_id);
                return {
                    ...trip,
                    gtfsData,
                };
            });
            const tripsPositionsWithGTFSDataToUpdate = await Promise.all(promisesGetGTFSData);

            const promisesToUpdate = [
                // Lets process every position if gtfs shape points and schedules data is ready
                tripsPositionsWithGTFSDataToUpdate.filter((e: any) => e.gtfsData !== null).map(async (trip: any) => {
                    return this.computePositions(trip);
                }),
                // For those not ready firstly gather gtfs shape points and schedules
                tripsPositionsWithGTFSDataToUpdate.filter((e: any) => e.gtfsData === null).map(async (trip: any) => {
                    log.debug("Delay Computation data (Redis) was not found. (gtfsTripId = " + trip.gtfs_trip_id + ")");
                    try {
                        const gtfs = await this.getResultObjectForDelayCalculation(trip.gtfs_trip_id);
                        await this.delayComputationTripsModel.save("trip.trip_id", [gtfs]);
                        trip.gtfsData = gtfs;

                        return this.computePositions(trip);
                    } catch (err) {
                        return Promise.resolve();
                    }
                }),
            ];

            // Both update in parallel and in one batch
            await Promise.all([
                Promise.all(promisesToUpdate[0]).then((computedPositions: any[][]) => {
                    return this.modelPositions.bulkUpdate(_.flatten(computedPositions));
                }),
                Promise.all(promisesToUpdate[1]).then((computedPositions: any[][]) => {
                    return this.modelPositions.bulkUpdate(_.flatten(computedPositions));
                }),
            ]);

        } catch (err) {
            throw new CustomError(`Error while updating delay.`, true, this.constructor.name, 5001, err);
        }
    }

    private getEstimatedPoint = (
            tripShapePoints,
            currentPosition,
            lastPosition,
            startDayTimestamp,
        ): Promise<any> => {

        const pt = currentPosition;
        // init radius around GPS position ( 200 meters radius, 16 points polygon aka circle)
        const radius = turf.circle(pt, 0.2, { steps: 16 });

        const ptsInRadius = [];
        let segmentIndex = 0;
        let lastWasIn = true;

        // FIND ALL SHAPE POINTS IN POLYGON CIRCLE, GET SEGMENTS WITH CONSEQUENTING POINTS
        const tripShapePointsIterator = (i: number, cb: () => void): void => {
            // end of iteration
            if (tripShapePoints.length === i) {
                return cb();
            }

            if (turf.booleanPointInPolygon(turf.point(tripShapePoints[i].coordinates), radius)) {
                if (!lastWasIn) {
                    if (ptsInRadius[segmentIndex] !== undefined) {
                        segmentIndex++;
                    }
                    lastWasIn = true;
                }
                if (ptsInRadius[segmentIndex] === undefined) {
                    ptsInRadius[segmentIndex] = [];
                }
                ptsInRadius[segmentIndex].push(tripShapePoints[i]);
            } else {
                lastWasIn = false;
            }

            // next step
            setImmediate(tripShapePointsIterator.bind(null, i + 1, cb));
        };

        // CHOOSE ONLY ONE CLOSEST IN EACH SHAPE SEGMENT
        const closestPts = [];
        const ptsInRadiusIterator = (i: number, cb: () => void): void => {
            // end of iteration
            if (ptsInRadius.length === i) {
                return cb();
            }

            const nPt = { distance: Infinity };
            innerPtsInRadiusIterator(i, 0, nPt, (res) => {
                // so now you have all possible nearest points on shape
                // (could be more if shape line is overlaping itself)
                closestPts.push(res);

                // next step
                setImmediate(ptsInRadiusIterator.bind(null, i + 1, cb));
            });
        };

        const innerPtsInRadiusIterator = (i: number, k: number, nPt: any, cb: (res) => void): void => {
            // end of iteration
            if (ptsInRadius[i].length === k) {
                return cb(nPt);
            }

            const distance = turf.distance(pt, turf.point(ptsInRadius[i][k].coordinates));
            if (distance < nPt.distance) {
                nPt = ptsInRadius[i][k];
                nPt.distance = distance;
            }

            // next step
            setImmediate(innerPtsInRadiusIterator.bind(null, i, k + 1, nPt, cb));
        };

        // want to find minimum difference of our prediction, where the bus should be
        let minTimeRealDiff = Infinity;
        const closestPtsIterator = (i: number, prevTimeDelay: number, rightPoint: any, cb: () => void): void => {
            // end of iteration
            if (closestPts.length === i) {
                return cb();
            }

            // bus delay to this point
            const otArray = currentPosition.properties.origin_time.split(":");
            let originTimeSecond = parseInt(otArray[0], 10) * 3600
                + parseInt(otArray[1], 10) * 60
                + parseInt(otArray[2], 10);

            let timeDelay = originTimeSecond - closestPts[i].time_scheduled_seconds;

            if (timeDelay > (12 * 60 * 60) && originTimeSecond > (12 * 60 * 60)) {
                originTimeSecond -= (24 * 60 * 60);
            }
            if (timeDelay < (-1 * 12 * 60 * 60) && originTimeSecond < (1 * 12 * 60 * 60)) {
                originTimeSecond += (24 * 60 * 60);
            }

            timeDelay = originTimeSecond - closestPts[i].time_scheduled_seconds;

            // time where the bus should on this point
            const timeProposed = closestPts[i].time_scheduled_seconds + prevTimeDelay;

            // difference
            const timeRealDiff = (closestPts[i].time_scheduled_seconds + timeDelay) - timeProposed;

            // we look for the best fitting point
            if (Math.abs(timeRealDiff) < Math.abs(minTimeRealDiff)) {
                minTimeRealDiff = timeRealDiff;

                // save it for result
                rightPoint.properties.bearing = closestPts[i].bearing;
                rightPoint.geometry.coordinates = closestPts[i].coordinates;
                rightPoint.properties.shape_dist_traveled =
                    Math.round(closestPts[i].shape_dist_traveled * 1000) / 1000;
                rightPoint.properties.next_stop_id = closestPts[i].next_stop;
                rightPoint.properties.last_stop_id = closestPts[i].last_stop;
                rightPoint.properties.next_stop_sequence = closestPts[i].next_stop_sequence;
                rightPoint.properties.last_stop_sequence = closestPts[i].last_stop_sequence;
                rightPoint.properties.next_stop_arrival_time = startDayTimestamp +
                    + closestPts[i].next_stop_arrival_time_seconds * 1000;
                rightPoint.properties.last_stop_arrival_time = startDayTimestamp +
                    + closestPts[i].last_stop_arrival_time_seconds * 1000;
                rightPoint.properties.next_stop_departure_time = startDayTimestamp +
                    + closestPts[i].next_stop_departure_time_seconds * 1000;
                rightPoint.properties.last_stop_departure_time = startDayTimestamp +
                    + closestPts[i].last_stop_departure_time_seconds * 1000;
                rightPoint.properties.time_delay = timeDelay;
                rightPoint.properties.time_scheduled_seconds = closestPts[i].time_scheduled_seconds;
            }

            // next step
            setImmediate(closestPtsIterator.bind(null, i + 1, prevTimeDelay, rightPoint, cb));
        };

        // calling all iterators and returning the result
        return new Promise<any>((resolve, reject) => {

            tripShapePointsIterator(0, () => {

                ptsInRadiusIterator(0, () => {

                    // DECIDE WHICH POINT IS PROBABLY RIGHT
                    const rightPoint: any = turf.point(pt.geometry.coordinates, {});
                    rightPoint.properties.timestamp = pt.properties.timestamp;

                    if (closestPts.length > 0) {
                        // if we have last position and delay,
                        // it helps us to calculate with delay not only with scheduled times
                        let prevTimeDelay = 0;
                        if (lastPosition) {
                            prevTimeDelay = lastPosition.properties.time_delay;
                            rightPoint.properties.assigningProcess =
                                "time-closest from last - options: " + closestPts.length;
                        } else {
                            // in other case we assume no delay
                            rightPoint.properties.assigningProcess =
                                "time-closest from start - options: " + closestPts.length;
                        }

                        closestPtsIterator(0, prevTimeDelay, rightPoint, () => {
                            resolve(rightPoint);
                        });

                    } else { // if we wont find it
                        rightPoint.geometry = pt.geometry;
                        rightPoint.properties.assigningProcess = "not found";

                        resolve(rightPoint);
                    }
                });
            });
        });
    }

    private getResultObjectForDelayCalculation = async (tripId: string): Promise<any> => {
        try {
            const tripsModel = new RopidGTFSTripsModel();
            // const tripObject = await tripsModel.find({trip_id: tripId});
            const stopTimes = await tripsModel.findByIdWithStopTimes(tripId);
            const shapes = await tripsModel.findByIdWithShapes(tripId);

            // { <tripData>, stop_times: [ <stopTimesDataWithStop> ], shapes: [ <shapesData> ] }
            const trip = {
                ...stopTimes,
                ...shapes,
            };

            if (!trip.shape_id || !trip.shapes || trip.shapes.length === 0) {
                throw new Error(`"trip.shape_id" or "trip.shapes" was not found for id ${tripId}.`);
            }

            const tmpGtfs = {
                ...await this.getStopTimesForDelayComputation(trip),
                shapes_anchor_points: await this.getShapesAnchorPointsForDelayComputation(trip.shape_id, trip.shapes),
            };

            // ----------------------------------------------

            // TEMP constS
            const tmpStopTimes = tmpGtfs.tripsStopTimes;
            const stops = tmpGtfs.tripsStops;
            // MAKING COPY
            const shapesAnchorPoints = tmpGtfs.shapes_anchor_points;
            const shapePoints = [];

            // INDEXES OF ACTUAL stops
            let lastStop = 0;
            let nextStop = 1;

            const shapesAnchorPointsIterator = (i: number, cb: () => void): void => {
                // end of iteration
                if (shapesAnchorPoints.length === i) {
                    return cb();
                }

                const shapePoint = {
                    bearing: null,
                    coordinates: [],
                    distance_from_last_stop: null,
                    last_stop: null,
                    last_stop_arrival_time_seconds: null,
                    last_stop_departure_time_seconds: null,
                    last_stop_sequence: null,
                    next_stop: null,
                    next_stop_arrival_time_seconds: null,
                    next_stop_departure_time_seconds: null,
                    next_stop_sequence: null,
                    shape_dist_traveled: {},
                    time_scheduled_seconds: null,
                };

                shapePoint.shape_dist_traveled = shapesAnchorPoints[i].shape_dist_traveled;
                shapePoint.coordinates = [
                    shapesAnchorPoints[i].coordinates[0],
                    shapesAnchorPoints[i].coordinates[1],
                ];

                // add bearing from shape computed for previous shapePoint
                if (i > 0) {
                    // compute bearing from two shape points
                    let shapePointBearing = Math.round(turf.bearing(
                        turf.point(shapePoints[i - 1].coordinates),
                        turf.point(shapePoint.coordinates),
                    ));
                    // turf.bearing returns -180 to 180, when 0 is north
                    // we need 0 to 359, for negative value we substract from 360
                    if (shapePointBearing < 0) {
                        shapePointBearing = 360 - Math.abs(shapePointBearing);
                    }
                    // save bearing
                    shapePoints[i - 1].bearing = shapePointBearing;
                    // for the last shapePoint copy the bearing from last one
                    if (shapesAnchorPoints.length - 1 === i) {
                        shapePoint.bearing = shapePoints[i - 1].bearing;
                    }
                }

                // DECIDE WHENEVER IS NEXT shapes_anchor_points[i] JUST AFTER NEXT stop (BY DISTANCE)
                if (shapesAnchorPoints[i].shape_dist_traveled >= tmpStopTimes[nextStop].shape_dist_traveled
                    && i < (shapesAnchorPoints.length - 1) && nextStop < (stops.length - 1)) {
                    lastStop++;
                    nextStop++;
                }

                // ID FOR LAST AND NEXT STOPS
                shapePoint.last_stop = stops[lastStop].stop_id;
                shapePoint.next_stop = stops[nextStop].stop_id;

                // SEQUENCE FOR LAST AND NEXT STOPS (stop_sequence is indexed from 1)
                shapePoint.last_stop_sequence = lastStop + 1;
                shapePoint.next_stop_sequence = nextStop + 1;

                // TIMES FOR LAST AND NEXT STOPS
                shapePoint.last_stop_arrival_time_seconds = tmpStopTimes[lastStop].arrival_time_seconds;
                shapePoint.last_stop_departure_time_seconds = tmpStopTimes[lastStop].departure_time_seconds;
                shapePoint.next_stop_arrival_time_seconds = tmpStopTimes[nextStop].arrival_time_seconds;
                shapePoint.next_stop_departure_time_seconds = tmpStopTimes[nextStop].departure_time_seconds;

                // MAYBE NOT NECESSARY
                shapePoint.distance_from_last_stop = Math.round((
                    shapesAnchorPoints[i].shape_dist_traveled
                    - tmpStopTimes[lastStop].shape_dist_traveled) * 1000) / 1000;

                // COMPUTING SCHEDULED TIMES FOR EACH ANCHOR POINT - LINEAR INTERPOLATION BETWEEN STOPS
                shapePoint.time_scheduled_seconds =
                    tmpStopTimes[lastStop].departure_time_seconds
                    + Math.round(
                        (tmpStopTimes[nextStop].arrival_time_seconds - tmpStopTimes[lastStop].departure_time_seconds)
                        * shapePoint.distance_from_last_stop
                        / (tmpStopTimes[nextStop].shape_dist_traveled - tmpStopTimes[lastStop].shape_dist_traveled),
                    );

                shapePoints.push(shapePoint);

                // next step
                setImmediate(shapesAnchorPointsIterator.bind(null, i + 1, cb));
            };

            return new Promise((resolve, reject) => {
                shapesAnchorPointsIterator(0, () => {
                    // FINAL OBJECT
                    resolve({
                        shape_points: shapePoints,
                        trip: { ...trip, shapes: undefined, stop_times: undefined },
                    });
                });
            });
        } catch (err) {
            log.error(err);
            throw new CustomError("Error while getting object for delay calculation (trip_id=" + tripId + ").",
                true, undefined, undefined, err);
        }
    }

    private getShapesAnchorPointsForDelayComputation = async (shapeId: string, shapes: any[]): Promise<any> => {
        const shapesAnchorPoints = [];
        try {
            // CREATE turf LineString OBJECT FOR GIVEN COORDINATES
            const line = turf.lineString(shapes.map((p) => {
                return [parseFloat(p.shape_pt_lon), parseFloat(p.shape_pt_lat)];
            }));
            // DEFAULT step BETWEEN TWO POINTS ON PATH [km] - SHORT DISTANCE IMPACTS PROCESS DURATION
            const step = 0.1;

            const distance = ruler.lineDistance(line.geometry.coordinates);
            const lineIterator = (i: number, cb: () => void): void => {
                // end of iteration
                if (i >= distance) {
                    return cb();
                }

                // ADD ALL POINTS TO shapes_anchor_points
                shapesAnchorPoints.push({
                    // RETURNS coordinates ALONG path WITH GIVER i (DISTANCE) IN 5 DECIMAL PLACES
                    coordinates: ruler.along(line.geometry.coordinates, i).map((c) => {
                        return Math.round(c * 100000) / 100000;
                    }),
                    // shape_dist_traveled IS IMPORTANT FOR DECIDING LAST STOP
                    shape_dist_traveled: Math.round(i * 1000) / 1000, // 1 METER PRECISSION
                });

                // next step
                setImmediate(lineIterator.bind(null, i + step, cb));
            };

            return new Promise((resolve, reject) => {
                lineIterator(0, () => {
                    resolve(shapesAnchorPoints);
                });
            });
        } catch (err) {
            log.error(err);
            log.error(shapeId);
            return shapesAnchorPoints;
        }
    }

    private getStopTimesForDelayComputation = async (trip: any): Promise<any> => {
        const tripsStopTimes = [];
        const tripsStops = [];

        const stopTimesIterator = (i: number, cb: () => void): void => {
            // end of iteration
            if (trip.stop_times.length === i) {
                return cb();
            }

            // ADD stop_sequence
            trip.stop_times[i].stop_sequence = parseFloat(trip.stop_times[i].stop_sequence);

            // CAST shape_dist_traveled TO FLOAT
            trip.stop_times[i].shape_dist_traveled = parseFloat(trip.stop_times[i].shape_dist_traveled);

            // ADD TIME IN [s] AFTER MIDNIGHT
            const atArray = trip.stop_times[i].arrival_time.split(":");
            trip.stop_times[i].arrival_time_seconds = parseInt(atArray[0], 10) * 3600 // hours
                + parseInt(atArray[1], 10) * 60 // minutes
                + parseInt(atArray[2], 10); // seconds

            const dtArray = trip.stop_times[i].departure_time.split(":");
            trip.stop_times[i].departure_time_seconds = parseInt(dtArray[0], 10) * 3600 // hours
                + parseInt(dtArray[1], 10) * 60 // minutes
                + parseInt(dtArray[2], 10); // seconds

            // ADD stop_times TO trip_id
            tripsStopTimes.push(trip.stop_times[i]);
            // ADD stop_times TO stops FOR THAT trip_id
            tripsStops.push(trip.stop_times[i].stop);

            // next step
            setImmediate(stopTimesIterator.bind(null, i + 1, cb));
        };

        return new Promise((resolve, reject) => {
            stopTimesIterator(0, () => {
                resolve({ tripsStopTimes, tripsStops });
            });
        });
    }

}
