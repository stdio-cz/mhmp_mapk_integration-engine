"use strict";

import {  SkodaPalaceQueues } from "golemio-schema-definitions";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, XMLDataTypeStrategy } from "../../core/datasources";
import { Validator } from "../../core/helpers";
import { MongoModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { SkodaPalaceQueuesTransformation } from "./";

export class SkodaPalaceQueuesWorker extends BaseWorker {

    private dataSource: DataSource;
    private transformation: SkodaPalaceQueuesTransformation;
    private model: MongoModel;
    private historyModel: MongoModel;
    private queuePrefix: string;

    constructor() {
        super();
        this.dataSource = new DataSource(SkodaPalaceQueues.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers : {},
                    method: "GET",
                    url: config.datasources.SkodaPalaceQueues,
                }),
                new XMLDataTypeStrategy({
                    resultsPath: "html.body.div",
                    xml2jsParams: { explicitArray: false, ignoreAttrs: true, trim: true },
                }),
                new Validator(SkodaPalaceQueues.name + "DataSource",
                    SkodaPalaceQueues.datasourceMongooseSchemaObject));
        this.model = new MongoModel(SkodaPalaceQueues.name + "Model", {
                identifierPath: "municipal_authority_id",
                mongoCollectionName: SkodaPalaceQueues.mongoCollectionName,
                outputMongooseSchemaObject: SkodaPalaceQueues.outputMongooseSchemaObject,
                savingType: "insertOrUpdate",
                searchPath: (id, multiple) => (multiple)
                    ? { municipal_authority_id: { $in: id } }
                    : { municipal_authority_id: id },
                updateValues: (a, b) => {
                    return a;
                },
            },
            new Validator(SkodaPalaceQueues.name + "ModelValidator", SkodaPalaceQueues.outputMongooseSchemaObject),
        );
        this.transformation = new SkodaPalaceQueuesTransformation();
        this.historyModel = new MongoModel(SkodaPalaceQueues.history.name + "Model", {
                identifierPath: "municipal_authority_id",
                mongoCollectionName: SkodaPalaceQueues.history.mongoCollectionName,
                outputMongooseSchemaObject: SkodaPalaceQueues.history.outputMongooseSchemaObject,
                savingType: "insertOnly",
            },
            new Validator(SkodaPalaceQueues.history.name + "ModelValidator",
                SkodaPalaceQueues.history.outputMongooseSchemaObject),
        );
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + SkodaPalaceQueues.name.toLowerCase();
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
