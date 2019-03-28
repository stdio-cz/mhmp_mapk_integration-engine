"use strict";

import { RopidGTFS } from "data-platform-schema-definitions";
import { config } from "../../core/config";
import { DataSource, FTPProtocolStrategy, JSONDataTypeStrategy } from "../../core/datasources";
import { log } from "../../core/helpers";
import { PostgresModel, RedisModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import {
    RopidGTFSCisStopsTransformation,
    RopidGTFSMetadataModel,
    RopidGTFSTransformation } from "./";

const turf = require("@turf/turf");
const cheapruler = require("cheap-ruler");
const ruler = cheapruler(50);

export class RopidGTFSWorker extends BaseWorker {

    private dataSource: DataSource;
    private transformation: RopidGTFSTransformation;
    private redisModel: RedisModel;
    private metaModel: RopidGTFSMetadataModel;
    private dataSourceCisStops: DataSource;
    private transformationCisStops: RopidGTFSCisStopsTransformation;
    private cisStopGroupsModel: PostgresModel;
    private cisStopsModel: PostgresModel;
    private delayComputationTripsModel: RedisModel;
    private queuePrefix: string;

    constructor() {
        super();
        this.dataSource = new DataSource(RopidGTFS.name + "DataSource",
            new FTPProtocolStrategy({
                filename: config.datasources.RopidGTFSFilename,
                isCompressed: true,
                path: config.datasources.RopidGTFSPath,
                url: config.datasources.RopidFTP,
                whitelistedFiles: [
                    "agency.txt", "calendar.txt", "calendar_dates.txt",
                    "shapes.txt", "stop_times.txt", "stops.txt", "routes.txt", "trips.txt",
                ],
            }),
            new JSONDataTypeStrategy({resultsPath: ""}),
            null);
        this.transformation = new RopidGTFSTransformation();
        this.redisModel = new RedisModel(RopidGTFS.name + "Model", {
                isKeyConstructedFromData: false,
                prefix: "",
            },
        null);
        this.metaModel = new RopidGTFSMetadataModel();
        this.dataSourceCisStops = new DataSource(RopidGTFS.name + "CisStops",
            new FTPProtocolStrategy({
                filename: config.datasources.RopidGTFSCisStopsFilename,
                path: config.datasources.RopidGTFSCisStopsPath,
                url: config.datasources.RopidFTP,
            }),
            new JSONDataTypeStrategy({resultsPath: "stopGroups"}),
            null);
        this.transformationCisStops = new RopidGTFSCisStopsTransformation();
        this.cisStopGroupsModel = new PostgresModel(RopidGTFS.cis_stop_groups.name + "Model", {
                outputSequelizeAttributes: RopidGTFS.cis_stop_groups.outputSequelizeAttributes,
                pgTableName: RopidGTFS.cis_stop_groups.pgTableName,
                savingType: "insertOnly",
                tmpPgTableName: RopidGTFS.cis_stop_groups.tmpPgTableName,
            },
            null,
        );
        this.cisStopsModel = new PostgresModel(RopidGTFS.cis_stops.name + "Model", {
                outputSequelizeAttributes: RopidGTFS.cis_stops.outputSequelizeAttributes,
                pgTableName: RopidGTFS.cis_stops.pgTableName,
                savingType: "insertOnly",
                tmpPgTableName: RopidGTFS.cis_stops.tmpPgTableName,
            },
            null,
        );
        this.delayComputationTripsModel = new RedisModel(RopidGTFS.delayComputationTrips.name + "Model", {
                decodeDataAfterGet: JSON.parse,
                encodeDataBeforeSave: JSON.stringify,
                isKeyConstructedFromData: true,
                prefix: RopidGTFS.delayComputationTrips.mongoCollectionName,
            },
        null);
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + RopidGTFS.name.toLowerCase();
    }

    public checkForNewData = async (msg: any): Promise<void> => {
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

    public downloadFiles = async (msg: any): Promise<void> => {
        const files = await this.dataSource.getAll();
        const lastModified = await this.dataSource.getLastModified();
        const dbLastModified = await this.metaModel.getLastModified("PID_GTFS");
        await this.metaModel.save({
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

    public transformData = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        inputData.data = await this.redisModel.getData(inputData.filepath);
        const transformedData = await this.transformation.transform(inputData);
        const model = this.getModelByName(transformedData.name);
        await model.truncate(true);

        const dbLastModified = await this.metaModel.getLastModified("PID_GTFS");

        // save meta
        await this.metaModel.save({
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

    public saveDataToDB = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const model = this.getModelByName(inputData.name);
        await model.save(inputData.data, true);
    }

    public checkSavedRowsAndReplaceTables = async (msg: any): Promise<boolean> => {
        const dbLastModified = await this.metaModel.getLastModified("PID_GTFS");
        try {
            await this.metaModel.checkSavedRows("PID_GTFS", dbLastModified.version);
            await this.metaModel.replaceTables("PID_GTFS", dbLastModified.version);
            await this.sendMessageToExchange("workers." + this.queuePrefix + ".refreshDataForDelayCalculation",
                new Buffer("Just do it!"));
            return true;
        } catch (err) {
            log.error(err);
            await this.metaModel.rollbackFailedSaving("PID_GTFS", dbLastModified.version);
            return false;
        }
    }

    public downloadCisStops = async (msg: any): Promise<void> => {
        const data = await this.dataSourceCisStops.getAll();
        const lastModified = await this.dataSourceCisStops.getLastModified();
        const dbLastModified = await this.metaModel.getLastModified("CIS_STOPS");
        await this.metaModel.save({
            dataset: "CIS_STOPS",
            key: "last_modified",
            type: "DATASET_INFO",
            value: lastModified,
            version: dbLastModified.version + 1 });

        const transformedData = await this.transformationCisStops.transform(data);
        // save meta
        await this.metaModel.save([{
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
        try {
            await this.cisStopGroupsModel.truncate(true);
            await this.cisStopGroupsModel.save(transformedData.cis_stop_groups, true);
            await this.cisStopsModel.truncate(true);
            await this.cisStopsModel.save(transformedData.cis_stops, true);
            await this.metaModel.checkSavedRows("CIS_STOPS", dbLastModified.version + 1);
            await this.metaModel.replaceTables("CIS_STOPS", dbLastModified.version + 1);
        } catch (err) {
            log.error(err);
            await this.metaModel.rollbackFailedSaving("CIS_STOPS", dbLastModified.version + 1);
        }
    }

    public refreshDataForDelayCalculation = async (msg: any): Promise<void> => {
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
        // TODO optimalizovat
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

            if (j % 150 === 0 || j === totalCount) {
                const buffer = new Buffer(JSON.stringify(chunk));
                chunk = [];
                return this.sendMessageToExchange("workers." + this.queuePrefix + ".saveDataForDelayCalculation",
                    buffer);
            } else {
                return Promise.resolve();
            }
        });
        // send message to checking if process is done
        await Promise.all(promises);
        log.debug(" >> END");
    }

    public saveDataForDelayCalculation = async (msg: any): Promise<void> => {
        const trips = JSON.parse(msg.content.toString());
        await this.delayComputationTripsModel.save("trip.trip_id", trips);
    }

    private getModelByName = (name: string): PostgresModel => {
        if (RopidGTFS[name].name) {
            return new PostgresModel(RopidGTFS[name].name + "Model", {
                    outputSequelizeAttributes: RopidGTFS[name].outputSequelizeAttributes,
                    pgTableName: RopidGTFS[name].pgTableName,
                    savingType: "insertOnly",
                    tmpPgTableName: RopidGTFS[name].tmpPgTableName,
                },
                null,
            );
        }
        return null;
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
            const res = await model.findAndCountAll({ order: m.order, raw: true });
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

            // ADD stop_times TO trip_id
            tmpGtfs.trips_stop_times[gtfs.stop_times[i].trip_id].push(gtfs.stop_times[i]);
            // ADD stop_times TO stops FOR THAT trip_id
            tmpGtfs.trips_stops[gtfs.stop_times[i].trip_id].push(tmpGtfs.stops[gtfs.stop_times[i].stop_id]);
        }
        return [ gtfs, tmpGtfs ];
    }

}
