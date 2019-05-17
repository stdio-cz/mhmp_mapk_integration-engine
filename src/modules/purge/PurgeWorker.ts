"use strict";

import { TrafficCameras } from "golemio-schema-definitions";
import { PostgresConnector } from "../../core/connectors";
import { log, Validator } from "../../core/helpers";
import { CustomError } from "../../core/helpers/errors";
import { MongoModel } from "../../core/models";

export class PurgeWorker {

    private trafficCamerasHistoryModel: MongoModel;

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
            throw new CustomError("Error while purging old data.", true, this.constructor.name, 1017, err);
        }
    }

    public deleteOldMerakiAccessPointsObservations = async (msg: any): Promise<void> => {
        try {
            const res = await PostgresConnector.getConnection().query(
                "SELECT * FROM retention('merakiaccesspoints_observations','timestamp',168);",
            );
            log.debug(res);
        } catch (err) {
            throw new CustomError("Error while purging old data.", true, this.constructor.name, 1017, err);
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
            throw new CustomError("Error while purging old data.", true, this.constructor.name, 1017, err);
        }
    }

}
