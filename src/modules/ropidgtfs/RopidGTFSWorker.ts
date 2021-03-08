"use strict";

import { CustomError } from "@golemio/errors";
import { RopidGTFS } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import { config } from "../../core/config";
import { DataSource, FTPProtocolStrategy, JSONDataTypeStrategy } from "../../core/datasources";
import { log } from "../../core/helpers";
import { PostgresModel, RedisModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import {
    RopidGTFSCisStopsTransformation,
    RopidGTFSMetadataModel,
    RopidGTFSTransformation,
} from "./";

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
                tmpDir: "/tmp/",
                url: config.datasources.RopidFTP,
                whitelistedFiles: [
                    "agency.txt", "calendar.txt", "calendar_dates.txt",
                    "shapes.txt", "stop_times.txt", "stops.txt", "routes.txt", "trips.txt",
                ],
            }),
            new JSONDataTypeStrategy({ resultsPath: "" }),
            null);
        this.transformation = new RopidGTFSTransformation();
        this.redisModel = new RedisModel(RopidGTFS.name + "Model", {
            isKeyConstructedFromData: false,
            prefix: "files",
        },
            null);
        this.metaModel = new RopidGTFSMetadataModel();
        const cisStopsTypeStrategy = new JSONDataTypeStrategy({ resultsPath: "stopGroups" });
        cisStopsTypeStrategy.setFilter((item) => item.cis !== 0);
        this.dataSourceCisStops = new DataSource(RopidGTFS.name + "CisStops",
            new FTPProtocolStrategy({
                filename: config.datasources.RopidGTFSCisStopsFilename,
                path: config.datasources.RopidGTFSCisStopsPath,
                tmpDir: "/tmp/",
                url: config.datasources.RopidFTP,
            }),
            cisStopsTypeStrategy,
            null);
        this.transformationCisStops = new RopidGTFSCisStopsTransformation();
        this.cisStopGroupsModel = new PostgresModel(RopidGTFS.cis_stop_groups.name + "Model", {
            hasTmpTable: true,
            outputSequelizeAttributes: RopidGTFS.cis_stop_groups.outputSequelizeAttributes,
            pgTableName: RopidGTFS.cis_stop_groups.pgTableName,
            savingType: "insertOnly",
        },
            new Validator(RopidGTFS.cis_stop_groups.name + "ModelValidator",
                RopidGTFS.cis_stop_groups.outputMongooseSchemaObject),
        );
        this.cisStopsModel = new PostgresModel(RopidGTFS.cis_stops.name + "Model", {
            hasTmpTable: true,
            outputSequelizeAttributes: RopidGTFS.cis_stops.outputSequelizeAttributes,
            pgTableName: RopidGTFS.cis_stops.pgTableName,
            savingType: "insertOnly",
        },
            new Validator(RopidGTFS.cis_stops.name + "ModelValidator",
                RopidGTFS.cis_stops.outputMongooseSchemaObject),
        );
        this.delayComputationTripsModel = new RedisModel(RopidGTFS.delayComputationTrips.name + "Model", {
            decodeDataAfterGet: JSON.parse,
            encodeDataBeforeSave: JSON.stringify,
            isKeyConstructedFromData: true,
            prefix: RopidGTFS.delayComputationTrips.mongoCollectionName,
        },
            new Validator(RopidGTFS.delayComputationTrips.name + "ModelValidator",
                RopidGTFS.delayComputationTrips.outputMongooseSchemaObject),
        );
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + RopidGTFS.name.toLowerCase();
    }

    public checkForNewData = async (msg: any): Promise<void> => {
        // checking PID_GTFS dataset
        const serverLastModified = await this.dataSource.getLastModified();
        const dbLastModified = await this.metaModel.getLastModified("PID_GTFS");
        if (serverLastModified !== dbLastModified.lastModified) {
            await this.sendMessageToExchange("workers." + this.queuePrefix + ".downloadFiles",
                "Just do it!");
        }

        // checking CIS_STOPS dataset
        const CISserverLastModified = await this.dataSourceCisStops.getLastModified();
        const CISdbLastModified = await this.metaModel.getLastModified("CIS_STOPS");
        if (CISserverLastModified !== CISdbLastModified.lastModified) {
            await this.sendMessageToExchange("workers." + this.queuePrefix + ".downloadCisStops",
                "Just do it!");
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
            version: dbLastModified.version + 1 || 1,
        });

        // send messages for transformation
        const promises = files.map(async (file) => {
            // save meta
            await this.metaModel.save({
                dataset: "PID_GTFS",
                key: file.name,
                type: "STATE",
                value: "DOWNLOADED",
                version: dbLastModified.version + 1 || 1,
            });
            return this.sendMessageToExchange("workers." + this.queuePrefix + ".transformData",
                JSON.stringify(file));
        });
        await Promise.all(promises);
    }

    public transformData = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        inputData.data = await this.redisModel.getData(inputData.filepath);
        const transformedData = await this.transformation.transform(inputData);
        const model = this.getModelByName(transformedData.name);
        await model.truncate(true);

        const dbLastModified = await this.metaModel.getLastModified("PID_GTFS");

        let parsed = [];
        let rowCount = 0;
        for await (const row of transformedData.data) {
            rowCount++;
            parsed.push(row);
            if (parsed.length % 1000 === 0) {
                await this.sendMessageToExchange("workers." + this.queuePrefix + ".saveDataToDB",
                    JSON.stringify({
                        data: parsed,
                        name: transformedData.name,
                    }));
                parsed = [];
            }
        }

        if (parsed.length > 0) {
            await this.sendMessageToExchange("workers." + this.queuePrefix + ".saveDataToDB",
                JSON.stringify({
                    data: parsed,
                    name: transformedData.name,
                }));
            parsed = [];
        }

        // save meta
        await this.metaModel.save({
            dataset: "PID_GTFS",
            key: transformedData.name,
            type: "TABLE_TOTAL_COUNT",
            value: rowCount,
            version: dbLastModified.version,
        });

        // save meta
        await this.metaModel.updateState("PID_GTFS", transformedData.name, "TRANSFORMED", dbLastModified.version);
        log.debug(`${transformedData.name}: parsed and sent ${rowCount} rows`);
    }

    public saveDataToDB = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const model = this.getModelByName(inputData.name);
        await model.save(inputData.data, true);

        // save meta
        const dbLastModified = await this.metaModel.getLastModified("PID_GTFS");
        await this.metaModel.updateSavedRows("PID_GTFS", inputData.name, inputData.data.length, dbLastModified.version);
    }

    public checkAllTablesHasSavedState = async (msg: any): Promise<boolean> => {
        const dbLastModified = await this.metaModel.getLastModified("PID_GTFS");
        return this.metaModel.checkAllTablesHasSavedState("PID_GTFS", dbLastModified.version);
    }

    public checkSavedRowsAndReplaceTables = async (msg: any): Promise<boolean> => {
        const dbLastModified = await this.metaModel.getLastModified("PID_GTFS");
        const alreadyDeployed = await this.metaModel
            .checkIfNewVersionIsAlreadyDeployed("PID_GTFS", dbLastModified.version);
        const allSaved = await this.metaModel.checkAllTablesHasSavedState("PID_GTFS", dbLastModified.version);

        if (alreadyDeployed) {
            return true;
        }

        try {
            if (!allSaved) {
                throw new Error("Some tables are not completely saved.");
            }
            await this.metaModel.checkSavedRows("PID_GTFS", dbLastModified.version);
            await this.metaModel.replaceTables("PID_GTFS", dbLastModified.version);
            await this.delayComputationTripsModel.truncate();
            await this.metaModel.refreshMaterializedViews();
            // save meta
            await this.metaModel.save({
                dataset: "PID_GTFS",
                key: "deployed",
                type: "DATASET_INFO",
                value: "true",
                version: dbLastModified.version,
            });
            return true;
        } catch (err) {
            await this.metaModel.rollbackFailedSaving("PID_GTFS", dbLastModified.version);
            throw new CustomError("Error while checking RopidGTFS saved rows.", true, this.constructor.name, 5004, err);
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
            version: dbLastModified.version + 1,
        });

        const transformedData = await this.transformationCisStops.transform(data);

        // duplicity checking
        // TODO is it ok if all duplicate items are removed?
        const uniqueMap = new Map();
        const duplicateCisStopGroups = [];
        transformedData.cis_stop_groups.forEach((item) => {
            if (uniqueMap.has(item.cis)) {
                duplicateCisStopGroups.push(item.cis);
                uniqueMap.delete(item.cis);
            } else {
                uniqueMap.set(item.cis, item);
            }
        });
        const uniqueCisStopGroups = [...uniqueMap.values()];

        if (duplicateCisStopGroups.length > 0) {
            log.warn("CIS_STOP_GROUPS contains duplicate cis. Items with this cis was removed: "
                + JSON.stringify(duplicateCisStopGroups));
        }

        // save meta
        await this.metaModel.save([{
            dataset: "CIS_STOPS",
            key: "cis_stop_groups",
            type: "TABLE_TOTAL_COUNT",
            value: uniqueCisStopGroups.length,
            version: dbLastModified.version + 1,
        }, {
            dataset: "CIS_STOPS",
            key: "cis_stops",
            type: "TABLE_TOTAL_COUNT",
            value: transformedData.cis_stops.length,
            version: dbLastModified.version + 1,
        }]);
        try {
            await this.cisStopGroupsModel.truncate(true);
            await this.cisStopGroupsModel.save(uniqueCisStopGroups, true);
            await this.cisStopsModel.truncate(true);
            await this.cisStopsModel.save(transformedData.cis_stops, true);
            await this.metaModel.checkSavedRows("CIS_STOPS", dbLastModified.version + 1);
            await this.metaModel.replaceTables("CIS_STOPS", dbLastModified.version + 1);
        } catch (err) {
            log.error(err);
            await this.metaModel.rollbackFailedSaving("CIS_STOPS", dbLastModified.version + 1);
        }
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

    private getPrimaryKeyByName = (name: string): string[] => {
        switch (name) {
            case "agency":
                return [ "agency_id" ];
            case "calendar":
                return [ "service_id" ];
            case "calendar_dates":
                return [ "date", "service_id" ];
            case "routes":
                return [ "route_id" ];
            case "shapes":
                return [ "shape_id", "shape_pt_sequence" ];
            case "stop_times":
                return [ "stop_sequence", "trip_id" ];
            case "stops":
                return [ "stop_id" ];
            case "trips":
                return [ "trip_id" ];
            default:
                return null;
        }
    }

}
