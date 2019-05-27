"use strict";

import { IceGatewaySensors } from "golemio-schema-definitions";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, JSONDataTypeStrategy } from "../../core/datasources";
import { Validator } from "../../core/helpers";
import { MongoModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { IceGatewaySensorsTransformation } from "./";

export class IceGatewaySensorsWorker extends BaseWorker {

    private dataSource: DataSource;
    private model: MongoModel;
    private transformation: IceGatewaySensorsTransformation;
    private historyModel: MongoModel;
    private queuePrefix: string;

    constructor() {
        super();
        this.dataSource = new DataSource(IceGatewaySensors.name + "DataSource",
            new HTTPProtocolStrategy({
                headers : {
                    Authorization: "Token " + config.datasources.IGToken,
                },
                method: "GET",
                url: config.datasources.IGSensors,
            }),
            new JSONDataTypeStrategy({resultsPath: ""}),
            new Validator(IceGatewaySensors.name + "DataSource", IceGatewaySensors.datasourceMongooseSchemaObject));
        this.model = new MongoModel(IceGatewaySensors.name + "Model", {
                identifierPath: "properties.id",
                modelIndexes: [{ geometry : "2dsphere" }],
                mongoCollectionName: IceGatewaySensors.mongoCollectionName,
                outputMongooseSchemaObject: IceGatewaySensors.outputMongooseSchemaObject,
                resultsPath: "properties",
                savingType: "insertOrUpdate",
                searchPath: (id, multiple) => (multiple)
                    ? { "properties.id": { $in: id } }
                    : { "properties.id": id },
                updateValues: (a, b) => {
                    a.properties.sensors = b.properties.sensors;
                    a.properties.updated_at = b.properties.updated_at;
                    return a;
                },
            },
            new Validator(IceGatewaySensors.name + "ModelValidator", IceGatewaySensors.outputMongooseSchemaObject),
        );
        this.transformation = new IceGatewaySensorsTransformation();
        this.historyModel = new MongoModel(IceGatewaySensors.history.name + "Model", {
                identifierPath: "id",
                mongoCollectionName: IceGatewaySensors.history.mongoCollectionName,
                outputMongooseSchemaObject: IceGatewaySensors.history.outputMongooseSchemaObject,
                savingType: "insertOnly",
            },
            new Validator(IceGatewaySensors.history.name + "ModelValidator",
                IceGatewaySensors.history.outputMongooseSchemaObject),
        );
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + IceGatewaySensors.name.toLowerCase();
    }

    public refreshDataInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSource.getAll();
        const transformedData = await this.transformation.transform(data);
        await this.model.save(transformedData);

        // send message for historization
        await this.sendMessageToExchange("workers." + this.queuePrefix + ".saveDataToHistory",
            new Buffer(JSON.stringify(transformedData)), { persistent: true });
    }

    public saveDataToHistory = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const transformedData = await this.transformation.transformHistory(inputData);
        await this.historyModel.save(transformedData);
    }

}
