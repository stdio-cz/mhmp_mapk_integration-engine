"use strict";

import { RopidGTFS, VehiclePositions } from "golemio-schema-definitions";
import { config } from "../../core/config";
import { log, Validator } from "../../core/helpers";
import { PostgresModel, RedisModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { RopidGTFSTripsModel } from "../ropidgtfs";
import {
    VehiclePositionsPositionsModel,
    VehiclePositionsStopsModel,
    VehiclePositionsTransformation,
    VehiclePositionsTripsModel } from "./";

const turf = require("@turf/turf");
const cheapruler = require("cheap-ruler");
const ruler = cheapruler(50);

export class VehiclePositionsWorker extends BaseWorker {

    private modelPositions: VehiclePositionsPositionsModel;
    private modelStops: PostgresModel;
    private modelTrips: VehiclePositionsTripsModel;
    private transformation: VehiclePositionsTransformation;
    private delayComputationTripsModel: RedisModel;
    private queuePrefix: string;

    constructor() {
        super();
        this.modelPositions = new VehiclePositionsPositionsModel();
        this.modelStops = new VehiclePositionsStopsModel();
        this.modelTrips = new VehiclePositionsTripsModel();
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
            new Buffer(JSON.stringify(transformedData.stops)));

        // send message for update GTFSTripIds
        let promises = rows.inserted.map((trip) => {
            this.sendMessageToExchange("workers." + this.queuePrefix + ".updateGTFSTripId",
                new Buffer(JSON.stringify(trip)));
        });
        await Promise.all(promises);
        // send message for update delay
        promises = rows.updated.map((trip) => {
            this.sendMessageToExchange("workers." + this.queuePrefix + ".updateDelay",
                new Buffer(trip));
        });
        await Promise.all(promises);
    }

    public saveStopsToDB = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        await this.modelStops.save(inputData);
    }

    public updateGTFSTripId = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        await this.modelTrips.findAndUpdateGTFSTripId(inputData);
        await this.sendMessageToExchange("workers." + this.queuePrefix + ".updateDelay",
            new Buffer(inputData.id));
    }

    public updateDelay = async (msg: any): Promise<void> => {
        const tripId = msg.content.toString();
        const positionsToUpdate = await this.modelPositions.getPositionsForUdpateDelay(tripId);

        if (positionsToUpdate.length === 0) {
            return;
        }

        const gtfsTripId = positionsToUpdate[0].gtfs_trip_id;
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
                const estimatedPoint = this.getEstimatedPoint(tripShapePoints, currentPosition, lastPosition);
                newLastDelay = estimatedPoint.properties.time_delay;
                if (estimatedPoint.properties.time_delay !== undefined
                        && estimatedPoint.properties.time_delay !== null) {
                    return this.modelPositions.updateDelay(position.id, position.origin_time,
                        estimatedPoint.properties.time_delay, estimatedPoint.properties.shape_dist_traveled,
                        estimatedPoint.properties.next_stop_id);
                } else {
                    return Promise.resolve();
                }
            } else {
                newLastDelay = null;
                return Promise.resolve();
            }
        });
        await Promise.all(promises);
    }

    private getEstimatedPoint = (tripShapePoints, currentPosition, lastPosition) => {

        const pt = currentPosition;
        // init radius around GPS position ( 200 meters radius, 16 points polygon aka circle)
        const radius = turf.circle(pt, 0.2, {steps: 16});

        const ptsInRadius = [];
        let segmentIndex = 0;
        let lastWasIn = true;

        // FIND ALL SHAPE POINTS IN POLYGON CIRCLE, GET SEGMENTS WITH CONSEQUENTING POINTS
        for (let j = 0, jmax = tripShapePoints.length; j < jmax; j++) {
            if (turf.booleanPointInPolygon(turf.point(tripShapePoints[j].coordinates), radius)) {
                if (!lastWasIn) {
                    if (ptsInRadius[segmentIndex] !== undefined) {
                        segmentIndex++;
                    }
                    lastWasIn = true;
                }
                if (ptsInRadius[segmentIndex] === undefined) {
                    ptsInRadius[segmentIndex] = [];
                }
                ptsInRadius[segmentIndex].push(tripShapePoints[j]);
            } else {
                lastWasIn = false;
            }
        }

        // CHOOSE ONLY ONE CLOSEST IN EACH SHAPE SEGMENT
        const closestPts = [];
        for (let j = 0, jmax = ptsInRadius.length; j < jmax; j++) {

            let nPt = {distance: Infinity};
            for (let k = 0, kmax = ptsInRadius[j].length; k < kmax; k++) {
                const distance = turf.distance(pt, turf.point(ptsInRadius[j][k].coordinates));

                if (distance < nPt.distance) {
                    nPt = ptsInRadius[j][k];
                    nPt.distance = distance;
                }
            }
            // so now you have all possible nearest points on shape (could be more if shape line is overlaping itself)
            closestPts.push(nPt);
        }

        // DECIDE WHICH POINT IS PROBABLY RIGHT
        const rightPoint = turf.point(pt.geometry.coordinates, {});
        if (closestPts.length > 0) {

            // if we have last position and delay, it helps us to calculate with delay not only with scheduled times
            let prevTimeDelay = 0;
            if (lastPosition) {
                prevTimeDelay = lastPosition.properties.time_delay;
                rightPoint.properties.assigningProcess = "time-closest from last - options: " + closestPts.length;
            } else {
                // in other case we assume no delay
                rightPoint.properties.assigningProcess = "time-closest from start - options: " + closestPts.length;
            }

            // want to find minimum difference of our prediction, where the bus should be
            let minTimeRealDiff = Infinity;
            for (let j = 0, jmax = closestPts.length; j < jmax; j++) {

                // bus delay to this point
                const otArray = currentPosition.properties.origin_time.split(":");
                let originTimeSecond = parseInt(otArray[0], 10) * 3600
                    + parseInt(otArray[1], 10) * 60
                    + parseInt(otArray[2], 10);

                let timeDelay = originTimeSecond - closestPts[j].time_scheduled_seconds;

                if (timeDelay > (12 * 60 * 60) && originTimeSecond > (12 * 60 * 60)) {
                    originTimeSecond += (24 * 60 * 60);
                }
                if (timeDelay < (-1 * 12 * 60 * 60) && originTimeSecond < (-1 * 12 * 60 * 60)) {
                    originTimeSecond -= (24 * 60 * 60);
                }

                timeDelay = originTimeSecond - closestPts[j].time_scheduled_seconds;

                // time where the bus should on this point
                const timeProposed = closestPts[j].time_scheduled_seconds + prevTimeDelay;

                // difference
                const timeRealDiff = (closestPts[j].time_scheduled_seconds + timeDelay) - timeProposed;

                // we look for the best fitting point
                if (Math.abs(timeRealDiff) < Math.abs(minTimeRealDiff)) {
                    minTimeRealDiff = timeRealDiff;

                    // save it for result
                    rightPoint.geometry.coordinates = closestPts[j].coordinates;
                    rightPoint.properties.shape_dist_traveled = this.r4d(closestPts[j].shape_dist_traveled);
                    rightPoint.properties.next_stop_id = closestPts[j].next_stop;
                    rightPoint.properties.time_delay = timeDelay;
                    rightPoint.properties.time_scheduled_seconds = closestPts[j].time_scheduled_seconds;
                }
            }
        } else { // if we wont find it
            rightPoint.geometry = pt.geometry;
            rightPoint.properties.assigningProcess = "not found";
        }

        rightPoint.properties.timestamp = pt.properties.timestamp;

        return rightPoint;
    }

    private r4d = (num: number) => {
        return Math.round(num * 1000) / 1000;
    }

    private getResultObjectForDelayCalculation = async (tripId: string): Promise<any> => {
        const tripsModel = new RopidGTFSTripsModel();
        const stopTimes = await tripsModel.findByIdWithStopTimes(tripId);
        const shapes = await tripsModel.findByIdWithShapes(tripId);

        // { <tripData>, stop_times: [ <stopTimesDataWithStop> ], shapes: [ <shapesData> ] }
        const trip = {
            ...stopTimes.dataValues,
            ...shapes.dataValues,
        };

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

        for (let i = 0, imax = shapesAnchorPoints.length; i < imax; i++) {
            const shapePoint = {
                coordinates: [],
                distance_from_last_stop: null,
                last_stop: null,
                next_stop: null,
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
        }
        // FINAL OBJECT
        return {
            shape_points: shapePoints,
            trip: { ...trip, shapes: undefined, stop_times: undefined },
        };
    }

    private getShapesAnchorPointsForDelayComputation = async (shapeId: string, shapes: any[]): Promise<any> => {
        const shapesAnchorPoints = [];
        try {
            // CREATE turf LineString OBJECT FOR GIVEN COORDINATES
            const line = turf.lineString(shapes.map((p) => {
                return [ parseFloat(p.shape_pt_lon), parseFloat(p.shape_pt_lat) ];
            }));
            // DEFAULT step BETWEEN TWO POINTS ON PATH [km] - SHORT DISTANCE IMPACTS PROCESS DURATION
            const step = 0.1;

            // CREATE SET OF POINTS WITH step DISTANCE ALONG line
            for (let j = 0, jmax = ruler.lineDistance(line.geometry.coordinates); j < jmax; j = j + step) {
                // ADD ALL POINTS TO shapes_anchor_points
                shapesAnchorPoints.push({
                    // RETURNS coordinates ALONG path WITH GIVER i (DISTANCE) IN 5 DECIMAL PLACES
                    coordinates: ruler.along(line.geometry.coordinates, j).map((c) => {
                        return Math.round(c * 100000) / 100000;
                    }),
                    // shape_dist_traveled IS IMPORTANT FOR DECIDING LAST STOP
                    shape_dist_traveled: Math.round(j * 1000) / 1000, // 1 METER PRECISSION
                });
            }
        } catch (err) {
            log.error(err);
            log.error(shapeId);
        }
        return shapesAnchorPoints;
    }

    private getStopTimesForDelayComputation = async (trip: any): Promise<any> => {
        const tripsStopTimes = [];
        const tripsStops = [];
        for (let i = 0, imax = trip.stop_times.length; i < imax; i++) {
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
        }
        return { tripsStopTimes, tripsStops };
    }

    private getModelByName = (name: string): PostgresModel => {
        if (RopidGTFS[name].name) {
            return new PostgresModel(RopidGTFS[name].name + "Model", {
                    hasTmpTable: true,
                    outputSequelizeAttributes: RopidGTFS[name].outputSequelizeAttributes,
                    pgTableName: RopidGTFS[name].pgTableName,
                    savingType: "insertOnly",
                },
                new Validator(RopidGTFS[name].name + "ModelValidator",
                    RopidGTFS[name].outputMongooseSchemaObject),
            );
        }
        return null;
    }

}
