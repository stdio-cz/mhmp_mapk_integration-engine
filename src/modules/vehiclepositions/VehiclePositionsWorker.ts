"use strict";

import { RopidGTFS, VehiclePositions } from "golemio-schema-definitions";
import { config } from "../../core/config";
import { Validator } from "../../core/helpers";
import { CustomError } from "../../core/helpers/errors";
import { PostgresModel, RedisModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import {
    VehiclePositionsPositionsModel,
    VehiclePositionsTransformation,
    VehiclePositionsTripsModel } from "./";

const turf = require("@turf/turf");

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
        this.modelStops = new PostgresModel(VehiclePositions.stops.name + "Model", {
                outputSequelizeAttributes: VehiclePositions.stops.outputSequelizeAttributes,
                pgTableName: VehiclePositions.stops.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(VehiclePositions.stops.name + "ModelValidator",
                VehiclePositions.stops.outputMongooseSchemaObject),
        );
        this.modelTrips = new VehiclePositionsTripsModel();
        this.transformation = new VehiclePositionsTransformation();
        this.delayComputationTripsModel = new RedisModel(RopidGTFS.delayComputationTrips.name + "Model", {
                decodeDataAfterGet: JSON.parse,
                encodeDataBeforeSave: JSON.stringify,
                isKeyConstructedFromData: true,
                prefix: RopidGTFS.delayComputationTrips.mongoCollectionName,
            },
        null);
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
        const gtfs = await this.delayComputationTripsModel.getData(gtfsTripId);

        if (!gtfs) {
            throw new CustomError("Delay Computation data (Redis) was not found. "
                + "(gtfsTripId = " + gtfsTripId + ")", true);
        }

        const tripShapePoints = gtfs.shape_points;
        let newLastDelay = null;

        const promises = positionsToUpdate.map(async (position, key) => {
            if (position.delay === null || newLastDelay !== null) {
                const currentPosition = {
                    geometry: {
                        coordinates: [position.lng, position.lat],
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
                            coordinates: [positionsToUpdate[key - 1].lng, positionsToUpdate[key - 1].lat],
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

}
