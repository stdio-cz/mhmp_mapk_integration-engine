"use strict";

import { RopidGTFS } from "data-platform-schema-definitions";

import RopidGTFSCisStopsDataSource from "../datasources/RopidGTFSCisStopsDataSource";
import RopidGTFSDataSource from "../datasources/RopidGTFSDataSource";
import log from "../helpers/Logger";
import IModel from "../models/IModel";
import AgencyModel from "../models/RopidGTFS/AgencyModel";
import CalendarDatesModel from "../models/RopidGTFS/CalendarDatesModel";
import CalendarModel from "../models/RopidGTFS/CalendarModel";
import CisStopGroupsModel from "../models/RopidGTFS/CisStopGroupsModel";
import CisStopsModel from "../models/RopidGTFS/CisStopsModel";
import DelayComputationTripsModel from "../models/RopidGTFS/DelayComputationTripsModel";
import MetadataModel from "../models/RopidGTFS/MetadataModel";
import RoutesModel from "../models/RopidGTFS/RoutesModel";
import ShapesModel from "../models/RopidGTFS/ShapesModel";
import StopsModel from "../models/RopidGTFS/StopsModel";
import StopTimesModel from "../models/RopidGTFS/StopTimesModel";
import TripsModel from "../models/RopidGTFS/TripsModel";
import RopidGTFSCisStopsTransformation from "../transformations/RopidGTFSCisStopsTransformation";
import RopidGTFSTransformation from "../transformations/RopidGTFSTransformation";
import BaseWorker from "./BaseWorker";

const fs = require("fs");
const config = require("../config/ConfigLoader");
const turf = require("@turf/turf");
const cheapruler = require("cheap-ruler");
const moment = require("moment");
const ruler = cheapruler(50);

export default class RopidGTFSWorker extends BaseWorker {

    private dataSource: RopidGTFSDataSource;
    private transformation: RopidGTFSTransformation;
    private metaModel: MetadataModel;
    private dataSourceCisStops: RopidGTFSCisStopsDataSource;
    private transformationCisStops: RopidGTFSCisStopsTransformation;
    private cisStopGroupsModel: CisStopGroupsModel;
    private cisStopsModel: CisStopsModel;
    private delayComputationTripsModel: DelayComputationTripsModel;
    private queuePrefix: string;

    constructor() {
        super();
        this.dataSource = new RopidGTFSDataSource();
        this.transformation = new RopidGTFSTransformation();
        this.metaModel = new MetadataModel();
        this.dataSourceCisStops = new RopidGTFSCisStopsDataSource();
        this.transformationCisStops = new RopidGTFSCisStopsTransformation();
        this.cisStopGroupsModel = new CisStopGroupsModel();
        this.cisStopsModel = new CisStopsModel();
        this.delayComputationTripsModel = new DelayComputationTripsModel();
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + RopidGTFS.name.toLowerCase();
    }

    public checkForNewData = async (): Promise<void> => {
        // checking PID_GTFS dataset
        const serverLastModified = await this.dataSource.getLastModified();
        const dbLastModified = await this.metaModel.getLastModified("PID_GTFS");
        if (serverLastModified !== dbLastModified.lastModified) {
            await this.sendMessageToExchange("workers." + this.queuePrefix + ".downloadFiles",
                new Buffer("Just do it!"));
        }

        // checking CIS_STOPS dataset
        const CISserverLastModified = await this.dataSourceCisStops.getLastModified();
        const CISdbLastModified = await this.metaModel.getLastModified("CIS_STOPS");
        if (CISserverLastModified !== CISdbLastModified.lastModified) {
            await this.sendMessageToExchange("workers." + this.queuePrefix + ".downloadCisStops",
                new Buffer("Just do it!"));
        }
    }

    public downloadFiles = async (): Promise<void> => {
        const data = await this.dataSource.GetAll();
        const files = data.files;
        const lastModified = data.last_modified;
        const dbLastModified = await this.metaModel.getLastModified("PID_GTFS");
        await this.metaModel.SaveToDb({
            dataset: "PID_GTFS",
            key: "last_modified",
            type: "DATASET_INFO",
            value: lastModified,
            version: dbLastModified.version + 1 || 1 });

        // send messages for transformation
        const promises = files.map((file) => {
            return this.sendMessageToExchange("workers." + this.queuePrefix + ".transformData",
                new Buffer(JSON.stringify(file)));
        });
        await Promise.all(promises);

        // send message to checking if process is done
        await this.sendMessageToExchange("workers." + this.queuePrefix + ".checkingIfDone",
            new Buffer(JSON.stringify({count: files.length})));
    }

    public transformData = async (inputData): Promise<void> => {
        inputData.data = await this.readFile(inputData.filepath);
        const transformedData = await this.transformation.TransformDataElement(inputData);
        const model = this.getModelByName(transformedData.name);
        await model.Truncate(true);

        const dbLastModified = await this.metaModel.getLastModified("PID_GTFS");

        // save meta
        await this.metaModel.SaveToDb({
            dataset: "PID_GTFS",
            key: transformedData.name,
            type: "TABLE_TOTAL_COUNT",
            value: transformedData.total,
            version: dbLastModified.version });

        // send messages for saving to DB
        const promises = transformedData.data.map((chunk) => {
            return this.sendMessageToExchange("workers." + this.queuePrefix + ".saveDataToDB",
                new Buffer(JSON.stringify({
                    data: chunk,
                    name: transformedData.name,
                })));
        });
        await Promise.all(promises);
    }

    public saveDataToDB = async (inputData): Promise<void> => {
        const model = this.getModelByName(inputData.name);
        await model.SaveToDb(inputData.data, true);
    }

    public checkSavedRowsAndReplaceTables = async (): Promise<boolean> => {
        const dbLastModified = await this.metaModel.getLastModified("PID_GTFS");
        const result = await this.metaModel.checkSavedRowsAndReplaceTables("PID_GTFS", dbLastModified.version);
        if (result) {
            // send message to refresh data for delay calculation
            await this.sendMessageToExchange("workers." + this.queuePrefix + ".refreshDataForDelayCalculation",
                new Buffer("Just do it!"));
        }
        return result;
    }

    public downloadCisStops = async (): Promise<void> => {
        const data = await this.dataSourceCisStops.GetAll();
        const lastModified = data.last_modified;
        const dbLastModified = await this.metaModel.getLastModified("CIS_STOPS");
        await this.metaModel.SaveToDb({
            dataset: "CIS_STOPS",
            key: "last_modified",
            type: "DATASET_INFO",
            value: lastModified,
            version: dbLastModified.version + 1 });

        const transformedData = await this.transformationCisStops.TransformDataCollection(data.data);
        // save meta
        await this.metaModel.SaveToDb([{
            dataset: "CIS_STOPS",
            key: "cis_stop_groups",
            type: "TABLE_TOTAL_COUNT",
            value: transformedData.cis_stop_groups.length,
            version: dbLastModified.version + 1 }, {
            dataset: "CIS_STOPS",
            key: "cis_stops",
            type: "TABLE_TOTAL_COUNT",
            value: transformedData.cis_stops.length,
            version: dbLastModified.version + 1 }]);
        await this.cisStopGroupsModel.Truncate(true);
        await this.cisStopGroupsModel.SaveToDb(transformedData.cis_stop_groups, true);
        await this.cisStopsModel.Truncate(true);
        await this.cisStopsModel.SaveToDb(transformedData.cis_stops, true);
        await this.metaModel.checkSavedRowsAndReplaceTables("CIS_STOPS", dbLastModified.version + 1);
    }

    public refreshDataForDelayCalculation = async (): Promise<void> => {
        let gtfs = await this.getGTFSDataForDelayCalculationFromModels();

        log.debug(" >> GTFS processing...");

        let tmpGtfs = await this.getSimplifiedGTFSForDelayCalculation(gtfs);

        // CREATE FIXED DISTANCE POINTS ALONG LINE FOR EACH shape
        tmpGtfs = this.processShapesGTFSForDelayCalculation(tmpGtfs);

        // TRANSFORM AND COPY stop_times AND stops TO EACH trip
        [gtfs, tmpGtfs] = this.processStopTimesGTFSFroDelayCalculation(gtfs, tmpGtfs);

        // COMPUTING SCHEDULED TIMES FOR EACH shapes_anchor_points (DIFFER BY trip AND ITS stop_times)
        log.debug(" > trips shapes");
        const totalCount = Object.keys(gtfs.trips).length;
        let j = 0;
        let chunk = [];
        const promises = Object.keys(gtfs.trips).map((t) => {
            if (j % Math.round(totalCount / (100 / 2)) === 0 ) {
                log.debug("   progress " + Math.round(j / totalCount * 100) + "%");
            }

            // TEMP constS
            const trip_id = gtfs.trips[j].trip_id;
            const shape_id = gtfs.trips[j].shape_id;
            const stopTimes = tmpGtfs.trips_stop_times[trip_id];
            const stops = tmpGtfs.trips_stops[trip_id];
            // MAKING COPY
            const shapesAnchorPoints = tmpGtfs.shapes_anchor_points[shape_id];
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
                if (shapesAnchorPoints[i].shape_dist_traveled >= stopTimes[nextStop].shape_dist_traveled
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
                        - stopTimes[lastStop].shape_dist_traveled) * 1000) / 1000;

                // COMPUTING SCHEDULED TIMES FOR EACH ANCHOR POINT - LINEAR INTERPOLATION BETWEEN STOPS
                shapePoint.time_scheduled_seconds =
                    stopTimes[lastStop].departure_time_seconds
                    + Math.round(
                        (stopTimes[nextStop].arrival_time_seconds - stopTimes[lastStop].departure_time_seconds)
                        * shapePoint.distance_from_last_stop
                        / (stopTimes[nextStop].shape_dist_traveled - stopTimes[lastStop].shape_dist_traveled),
                    );

                shapePoints.push(shapePoint);
            }
            // FINAL OBJECT
            const trip = {
                shape_points: shapePoints,
                // stop_times: stopTimes,
                // stops,
                trip: gtfs.trips[j],
            };

            chunk.push(trip);
            j++;

            if (j % 200 === 0 || j === totalCount) {
                const buffer = new Buffer(JSON.stringify(chunk));
                chunk = [];
                return this.sendMessageToExchange("workers." + this.queuePrefix + ".saveDataForDelayCalculation",
                    buffer);
            } else {
                return Promise.resolve();
            }
        });
        // await this.delayComputationTripsModel.Truncate();
        // send message to checking if process is done
        await Promise.all(promises);
        await this.sendMessageToExchange("workers." + this.queuePrefix + ".checkingIfDoneDelayCalculation",
            new Buffer("Just Do It!"));
        log.debug(" >> END");
    }

    public saveDataForDelayCalculation = async (trip): Promise<void> => {
        await this.delayComputationTripsModel.SaveToDb(trip, true);
    }

    public checkSavedRowsAndReplaceTablesForDelayCalculation = async (): Promise<boolean> => {
        await this.delayComputationTripsModel.replaceTables();
        return true;
    }

    private getModelByName = (name: string): IModel => {
        switch (name) {
            case "agency":
                return new AgencyModel();
            case "calendar":
                return new CalendarModel();
            case "calendar_dates":
                return new CalendarDatesModel();
            case "shapes":
                return new ShapesModel();
            case "stop_times":
                return new StopTimesModel();
            case "routes":
                return new RoutesModel();
            case "stops":
                return new StopsModel();
            case "trips":
                return new TripsModel();
            default:
                return null;
        }
    }

    private readFile = (file: string): Promise<Buffer> => {
        return new Promise((resolve, reject) => {
            const stream = fs.createReadStream(file);
            const chunks = [];

            stream.on("error", (err) => {
                reject(err);
            });
            stream.on("data", (data) => {
                chunks.push(data);
            });
            stream.on("close", () => {
                resolve(Buffer.concat(chunks));
            });
        });
    }

    private getGTFSDataForDelayCalculationFromModels = async (): Promise<any> => {
        const models = [
            { name: "stops", order: [] },
            { name: "trips", order: [] },
            { name: "shapes", order: [["shape_id"], ["shape_pt_sequence"]] },
            { name: "stop_times", order: [["trip_id"], ["stop_sequence"]] },
        ];

        const gtfs = { shapes: [], stop_times: [], stops: [], trips: [] };

        const promises = models.map(async (m) => {
            const model = this.getModelByName(m.name);
            const res = await model.FindAndCountAll({ order: m.order, raw: true });
            gtfs[m.name] = res.rows;
            return;
        });
        await Promise.all(promises);
        log.debug("shapes #: " + gtfs.shapes.length);
        log.debug("stop_times #: " + gtfs.stop_times.length);
        log.debug("trips #: " + gtfs.trips.length);
        log.debug("stops #: " + gtfs.stops.length);
        return gtfs;
    }

    private getSimplifiedGTFSForDelayCalculation = async (gtfs: any): Promise<any> => {
        const tmpGtfs = {
            shapes: {},
            shapes_anchor_points: {},
            stops: {},
            trips_stop_times: {},
            trips_stops: {},
        };

        // INIT ARRAYS FOR stops BY stop_id
        // key (stop_id) : value ({stop})
        tmpGtfs.stops = {};
        gtfs.stops.forEach((s) => {
            tmpGtfs.stops[s.stop_id] = s;
        });

        // INIT ARRAYS FOR shapes BY shape_id
        // key (shape_id) : value ([shape])
        tmpGtfs.shapes = {};
        // key (shape_id) : value ([shape_anchor_points])
        tmpGtfs.shapes_anchor_points = {};

        gtfs.shapes.forEach((s) => {
            tmpGtfs.shapes[s.shape_id] = [];
            tmpGtfs.shapes_anchor_points[s.shape_id] = [];
        });
        // FASTER THAN DETECT IF KEY EXISTS
        gtfs.shapes.forEach((s) => {
            tmpGtfs.shapes[s.shape_id].push(s);
        });

        gtfs.trips.forEach((t) => {
            tmpGtfs.trips_stops[t.trip_id] = [];
            tmpGtfs.trips_stop_times[t.trip_id] = [];
        });

        return tmpGtfs;
    }

    private processShapesGTFSForDelayCalculation = (tmpGtfs) => {
        log.debug(" > shapes");
        const totalCount = Object.keys(tmpGtfs.shapes).length;
        Object.keys(tmpGtfs.shapes).map((shapeId, i) => {
            if (i % Math.round(totalCount / (100 / 20)) === 0 ) {
                log.debug("   progress " + Math.round(i / totalCount * 100) + "%");
            }
            try {
                const s = tmpGtfs.shapes[shapeId];

                // CREATE turf LineString OBJECT FOR GIVEN COORDINATES
                const line = turf.lineString(s.map((p) => {
                    return [ parseFloat(p.shape_pt_lon), parseFloat(p.shape_pt_lat) ];
                }));
                // DEFAULT step BETWEEN TWO POINTS ON PATH [km] - SHORT DISTANCE IMPACTS PROCESS DURATION
                const step = 0.1;

                // CREATE SET OF POINTS WITH step DISTANCE ALONG line
                for (let j = 0, jmax = ruler.lineDistance(line.geometry.coordinates); j < jmax; j = j + step) {
                    // ADD ALL POINTS TO shapes_anchor_points
                    tmpGtfs.shapes_anchor_points[shapeId].push({
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
        });
        return tmpGtfs;
    }

    private processStopTimesGTFSFroDelayCalculation = (gtfs, tmpGtfs) => {
        log.debug(" > trips stop times");
        const totalCount = gtfs.stop_times.length;
        for (let i = 0; i < totalCount; i++) {
            if (i % Math.round(totalCount / (100 / 20)) === 0 ) {
                log.debug("   progress " + Math.round(i / totalCount * 100) + "%");
            }

            // CAST shape_dist_traveled TO FLOAT
            gtfs.stop_times[i].shape_dist_traveled = parseFloat(gtfs.stop_times[i].shape_dist_traveled);

            // ADD TIME IN [s] AFTER MIDNIGHT
            const atArray = gtfs.stop_times[i].arrival_time.split(":");
            gtfs.stop_times[i].arrival_time_seconds = parseInt(atArray[0], 10) * 3600 // hours
                + parseInt(atArray[1], 10) * 60 // minutes
                + parseInt(atArray[2], 10); // seconds

            const dtArray = gtfs.stop_times[i].departure_time.split(":");
            gtfs.stop_times[i].departure_time_seconds = parseInt(dtArray[0], 10) * 3600 // hours
                + parseInt(dtArray[1], 10) * 60 // minutes
                + parseInt(dtArray[2], 10); // seconds

            /*
            const arrivalTimeSeconds =
                moment(gtfs.stop_times[i].arrival_time, "H:mm:ss").diff(moment().startOf("day"), "seconds");
            gtfs.stop_times[i].arrival_time_seconds = (!isNaN(arrivalTimeSeconds))
                ? arrivalTimeSeconds
                : null;
            const departureTimeSeconds =
                moment(gtfs.stop_times[i].departure_time, "H:mm:ss").diff(moment().startOf("day"), "seconds");
            gtfs.stop_times[i].departure_time_seconds = (!isNaN(departureTimeSeconds))
                ? departureTimeSeconds
                : null;
            */
            // ADD stop_times TO trip_id
            tmpGtfs.trips_stop_times[gtfs.stop_times[i].trip_id].push(gtfs.stop_times[i]);
            // ADD stop_times TO stops FOR THAT trip_id
            tmpGtfs.trips_stops[gtfs.stop_times[i].trip_id].push(tmpGtfs.stops[gtfs.stop_times[i].stop_id]);
        }
        return [ gtfs, tmpGtfs ];
    }

}
