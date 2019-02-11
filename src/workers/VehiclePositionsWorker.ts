"use strict";

import { VehiclePositions } from "data-platform-schema-definitions";
import CustomError from "../helpers/errors/CustomError";
import DelayComputationTripsModel from "../models/RopidGTFS/DelayComputationTripsModel";
import VehiclePositionsPositionsModel from "../models/VehiclePositionsPositionsModel";
import VehiclePositionsStopsModel from "../models/VehiclePositionsStopsModel";
import VehiclePositionsTripsModel from "../models/VehiclePositionsTripsModel";
import VehiclePositionsTransformation from "../transformations/VehiclePositionsTransformation";
import BaseWorker from "./BaseWorker";

const config = require("../config/ConfigLoader");
const turf = require("@turf/turf");

export default class VehiclePositionsWorker extends BaseWorker {

    private modelPositions: VehiclePositionsPositionsModel;
    private modelStops: VehiclePositionsStopsModel;
    private modelTrips: VehiclePositionsTripsModel;
    private transformation: VehiclePositionsTransformation;
    private delayComputationTripsModel: DelayComputationTripsModel;
    private queuePrefix: string;

    constructor() {
        super();
        this.modelPositions = new VehiclePositionsPositionsModel();
        this.modelStops = new VehiclePositionsStopsModel();
        this.modelTrips = new VehiclePositionsTripsModel();
        this.transformation = new VehiclePositionsTransformation();
        this.delayComputationTripsModel = new DelayComputationTripsModel();
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + VehiclePositions.name.toLowerCase();
    }

    public saveDataToDB = async (inputData): Promise<void> => {
        const transformedData = await this.transformation.TransformDataCollection(inputData);
        await this.modelPositions.SaveToDb(transformedData.positions);
        await this.modelStops.SaveToDb(transformedData.stops);
        const rows = await this.modelTrips.SaveToDb(transformedData.trips);

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

    public updateGTFSTripId = async (data: any): Promise<void> => {
        await this.modelTrips.findAndUpdateGTFSTripId(data);
        await this.sendMessageToExchange("workers." + this.queuePrefix + ".updateDelay",
            new Buffer(data.id));
    }

    /**
     * TODO Is this method needed?
     */
    public getTripsWithoutGTFSTripId = async (): Promise<void> => {
        const toUpdate = await this.modelTrips.getTripsWithoutGTFSTripId();

        // send messages for updating district and address and average occupancy
        const promises = toUpdate.map((tripToUpdate) => {
            this.sendMessageToExchange("workers." + this.queuePrefix + ".updateGTFSTripId",
                new Buffer(JSON.stringify(tripToUpdate)));
        });
        await Promise.all(promises);
    }

    public updateDelay = async (tripId: string): Promise<void> => {
        const positionsToUpdate = await this.modelPositions.getPositionsForUdpateDelay(tripId);

        if (positionsToUpdate.length === 0) {
            return;
        }

        const gtfsTripId = positionsToUpdate[0].gtfs_trip_id;
        const gtfs = await this.delayComputationTripsModel.GetOneFromModel(gtfsTripId);
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
                return this.modelPositions.updateDelay(position.id, position.origin_time,
                    estimatedPoint.properties.time_delay, estimatedPoint.properties.shape_dist_traveled,
                    estimatedPoint.properties.next_stop_id);
            } else {
                newLastDelay = null;
                return Promise.resolve();
            }
        });
        await Promise.all(promises);
    }

    private getEstimatedPoint = (tripShapePoints, currentPosition, lastPosition) => {

        const pt = currentPosition;
        // init radius around GPS position ( 100 meters radius, 16 points polygon aka circle)
        const radius = turf.circle(pt, 0.1, {steps: 16});

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
            const overMidnight: boolean = tripShapePoints.some((i) => i.time_scheduled_seconds >= (24 * 60 * 60));
            for (let j = 0, jmax = closestPts.length; j < jmax; j++) {

                // bus delay to this point
                // TODO kontrola pres pulnoc && timestamp < 12
/*
                let originTimeSecond = moment(currentPosition.properties.origin_timestamp)
                    .diff(moment().startOf("day"), "seconds");
*/
/*
                const t = momentTimezone(currentPosition.properties.origin_timestamp).tz("Europe/Prague").format();
                const otArray = t.split("T")[1].split(":");
                let originTimeSecond = parseInt(otArray[0], 10) * 3600
                    + parseInt(otArray[1], 10) * 60
                    + parseInt(otArray[2], 10)
                    + parseInt(t.split("T")[1].split("+")[1].split(":")[0], 10) * 60;
*/
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
                if (timeRealDiff < minTimeRealDiff) {
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
