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
import * as moment from "moment-timezone";
import * as Sequelize from "sequelize";
const ruler: any = cheapruler(50);
// const fs = require("fs").promises;
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
        const rows = await this.modelTrips.save(transformedData.trips);

        // send message for save stops
        await this.sendMessageToExchange("workers." + this.queuePrefix + ".saveStopsToDB",
            JSON.stringify(transformedData.stops));

        // send message for update GTFSTripIds
        let promises = rows.inserted.map((trip) => {
            this.sendMessageToExchange("workers." + this.queuePrefix + ".updateGTFSTripId",
                JSON.stringify(trip));
        });
        await Promise.all(promises);
        // send message for update delay
        promises = rows.updated.map((trip) => {
            this.sendMessageToExchange("workers." + this.queuePrefix + ".updateDelay",
                trip);
        });
        await Promise.all(promises);
    }

    public saveStopsToDB = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        await this.modelStops.saveBySqlFunction(inputData, [ "cis_stop_sequence", "trips_id" ]);
    }

    public updateGTFSTripId = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        try {
            const result = await this.modelTrips.findGTFSTripId(inputData);
            await this.modelTrips.update(result, {
                where: {
                    id: inputData.id,
                },
            });
            await this.sendMessageToExchange("workers." + this.queuePrefix + ".updateDelay",
                inputData.id);
        } catch (err) {
            throw new CustomError(`Error while updating gtfs_trip_id.`, true, this.constructor.name, 5001, err);
        }
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

    public updateDelay = async (msg: any): Promise<void> => {
        try {
            const tripId = msg.content.toString();
            const positionsToUpdate = await this.modelPositions.getPositionsForUdpateDelay(tripId);

            if (positionsToUpdate.length === 0) {
                return;
            }

            const gtfsTripId = positionsToUpdate[0].gtfs_trip_id;
            const startTimestamp = parseInt(positionsToUpdate[0].start_timestamp, 10);
            const startDayTimestamp = moment.utc(startTimestamp).startOf("day");
            let gtfs = await this.delayComputationTripsModel.getData(gtfsTripId);

            if (!gtfs) {
                log.debug("Delay Computation data (Redis) was not found. (gtfsTripId = " + gtfsTripId + ")");
                gtfs = await this.getResultObjectForDelayCalculation(gtfsTripId);
                await this.delayComputationTripsModel.save("trip.trip_id", [gtfs]);
            }

            const tripShapePoints = gtfs.shape_points;
            let newLastDelay = null;

            const promises = positionsToUpdate.map(async (position, key) => {
                if (position.delay === null || newLastDelay !== null) {
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
                    const lastPosition = (key > 0)
                        ? {
                            geometry: {
                                coordinates: [parseFloat(positionsToUpdate[key - 1].lng),
                                parseFloat(positionsToUpdate[key - 1].lat)],
                                type: "Point",
                            },
                            properties: {
                                time_delay: newLastDelay || positionsToUpdate[key - 1].delay,
                            },
                            type: "Feature",
                        }
                        : null;

                    // CORE processing
                    const estimatedPoint = await this.getEstimatedPoint(
                        tripShapePoints, currentPosition, lastPosition, startDayTimestamp,
                    );
                    newLastDelay = estimatedPoint.properties.time_delay;
                    if (estimatedPoint.properties.time_delay !== undefined
                        && estimatedPoint.properties.time_delay !== null) {

                        return this.modelPositions.updateDelay(
                            position.id,
                            position.origin_time,
                            estimatedPoint.properties.time_delay,
                            estimatedPoint.properties.shape_dist_traveled,
                            estimatedPoint.properties.next_stop_id,
                            estimatedPoint.properties.last_stop_id,
                            estimatedPoint.properties.next_stop_sequence,
                            estimatedPoint.properties.last_stop_sequence,
                            estimatedPoint.properties.next_stop_arrival_time,
                            estimatedPoint.properties.last_stop_arrival_time,
                            estimatedPoint.properties.next_stop_departure_time,
                            estimatedPoint.properties.last_stop_departure_time,
                        );
                    } else {
                        return Promise.resolve();
                    }
                } else {
                    newLastDelay = null;
                    return Promise.resolve();
                }
            });
            await Promise.all(promises);
        } catch (err) {
            throw new CustomError(`Error while updating delay.`, true, this.constructor.name, 5001, err);
        }
    }

    private getEstimatedPoint = (tripShapePoints, currentPosition, lastPosition, startDayTimestamp): Promise<any> => {

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
                rightPoint.geometry.coordinates = closestPts[i].coordinates;
                rightPoint.properties.shape_dist_traveled =
                    Math.round(closestPts[i].shape_dist_traveled * 1000) / 1000;
                rightPoint.properties.next_stop_id = closestPts[i].next_stop;
                rightPoint.properties.last_stop_id = closestPts[i].last_stop;
                rightPoint.properties.next_stop_sequence = closestPts[i].next_stop_sequence;
                rightPoint.properties.last_stop_sequence = closestPts[i].last_stop_sequence;
                rightPoint.properties.next_stop_arrival_time = startDayTimestamp
                    .clone().subtract(startDayTimestamp.tz("Europe/Prague").utcOffset(), "minutes")
                    .add(closestPts[i].next_stop_arrival_time_seconds, "seconds")
                    .valueOf();
                rightPoint.properties.last_stop_arrival_time = startDayTimestamp
                    .clone().subtract(startDayTimestamp.tz("Europe/Prague").utcOffset(), "minutes")
                    .add(closestPts[i].last_stop_arrival_time_seconds, "seconds")
                    .valueOf();
                rightPoint.properties.next_stop_departure_time = startDayTimestamp
                    .clone().subtract(startDayTimestamp.tz("Europe/Prague").utcOffset(), "minutes")
                    .add(closestPts[i].next_stop_departure_time_seconds, "seconds")
                    .valueOf();
                rightPoint.properties.last_stop_departure_time = startDayTimestamp
                    .clone().subtract(startDayTimestamp.tz("Europe/Prague").utcOffset(), "minutes")
                    .add(closestPts[i].last_stop_departure_time_seconds, "seconds")
                    .valueOf();
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

            // console.log(trip);

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
