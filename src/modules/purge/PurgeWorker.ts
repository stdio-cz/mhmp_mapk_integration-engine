"use strict";

import { CustomError } from "@golemio/errors";
import { SharedBikes, SharedCars, TrafficCameras } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import { PostgresConnector } from "../../core/connectors";
import { log } from "../../core/helpers";
import { MongoModel } from "../../core/models";

export class PurgeWorker {

    private trafficCamerasHistoryModel: MongoModel;
    private sharedBikesModel: MongoModel;
    private sharedCarsModel: MongoModel;

    constructor() {
        this.trafficCamerasHistoryModel = new MongoModel(TrafficCameras.history.name + "Model", {
            identifierPath: "id",
            mongoCollectionName: TrafficCameras.history.mongoCollectionName,
            outputMongooseSchemaObject: TrafficCameras.history.outputMongooseSchemaObject,
            savingType: "insertOnly",
        },
            new Validator(TrafficCameras.history.name + "ModelValidator",
                TrafficCameras.history.outputMongooseSchemaObject),
        );
        this.sharedBikesModel = new MongoModel(SharedBikes.name + "Model", {
            identifierPath: "properties.id",
            mongoCollectionName: SharedBikes.mongoCollectionName,
            outputMongooseSchemaObject: SharedBikes.outputMongooseSchemaObject,
            resultsPath: "properties",
            savingType: "insertOrUpdate",
            searchPath: (id, multiple) => (multiple)
                ? { "properties.id": { $in: id } }
                : { "properties.id": id },
        },
            new Validator(SharedBikes.name + "ModelValidator", SharedBikes.outputMongooseSchemaObject),
        );
        this.sharedCarsModel = new MongoModel(SharedCars.name + "Model", {
            identifierPath: "properties.id",
            mongoCollectionName: SharedCars.mongoCollectionName,
            outputMongooseSchemaObject: SharedCars.outputMongooseSchemaObject,
            resultsPath: "properties",
            savingType: "insertOrUpdate",
            searchPath: (id, multiple) => (multiple)
                ? { "properties.id": { $in: id } }
                : { "properties.id": id },
        },
            new Validator(SharedCars.name + "ModelValidator", SharedCars.outputMongooseSchemaObject),
        );
    }

    public deleteOldVehiclePositions = async (msg: any): Promise<void> => {
        try {
            let res = await PostgresConnector.getConnection().query(
                "SELECT * FROM retention('vehiclepositions_trips','created_at',48);",
            );
            log.debug(res);
            res = await PostgresConnector.getConnection().query(
                "SELECT * FROM retention('vehiclepositions_stops','created_at',48);",
            );
            log.debug(res);
            res = await PostgresConnector.getConnection().query(
                "SELECT * FROM retention('vehiclepositions_positions','created_at',48);",
            );
            log.debug(res);
        } catch (err) {
            throw new CustomError("Error while purging old data.", true, this.constructor.name, 5002, err);
        }
    }

    public deleteOldMerakiAccessPointsObservations = async (msg: any): Promise<void> => {
        try {
            const res = await PostgresConnector.getConnection().query(
                "SELECT * FROM retention('merakiaccesspoints_observations','timestamp',168);",
            );
            log.debug(res);
        } catch (err) {
            throw new CustomError("Error while purging old data.", true, this.constructor.name, 5002, err);
        }
    }

    public deleteOldTrafficCamerasHistory = async (msg: any): Promise<void> => {
        const now = new Date();
        const ttl = new Date();
        ttl.setHours(now.getHours() - 12);

        try {
            const res = await this.trafficCamerasHistoryModel.delete({
                updated_at: { $lt: ttl.getTime() },
            });
            log.debug(JSON.stringify(res));
        } catch (err) {
            throw new CustomError("Error while purging old data.", true, this.constructor.name, 5002, err);
        }
    }

    public deleteOldSharedBikes = async (msg: any): Promise<void> => {
        const now = new Date();
        const ttl = new Date();
        ttl.setMinutes(now.getMinutes() - 2);

        try {
            const res = await this.sharedBikesModel.delete({
                "properties.updated_at": { $lt: ttl.getTime() },
            });
            log.debug(JSON.stringify(res));
        } catch (err) {
            throw new CustomError("Error while purging old data.", true, this.constructor.name, 5002, err);
        }
    }

    public deleteOldSharedCars = async (msg: any): Promise<void> => {
        const now = new Date();
        const ttl = new Date();
        ttl.setMinutes(now.getMinutes() - 2);

        try {
            const res = await this.sharedCarsModel.delete({
                "properties.updated_at": { $lt: ttl.getTime() },
            });
            log.debug(JSON.stringify(res));
        } catch (err) {
            throw new CustomError("Error while purging old data.", true, this.constructor.name, 5002, err);
        }
    }

}
