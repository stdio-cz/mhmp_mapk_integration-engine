"use strict";

import { MunicipalAuthorities } from "golemio-schema-definitions";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, JSONDataTypeStrategy, XMLDataTypeStrategy } from "../../core/datasources";
import { Validator } from "../../core/helpers";
import { MongoModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { MunicipalAuthoritiesTransformation, SkodaPalaceQueuesTransformation } from "./";

export class MunicipalAuthoritiesWorker extends BaseWorker {

    private dataSource: DataSource;
    private transformation: MunicipalAuthoritiesTransformation;
    private model: MongoModel;
    private skodaPalaceQueuesDataSource: DataSource;
    private skodaPalaceQueuesTransformation: SkodaPalaceQueuesTransformation;
    private waitingQueuesModel: MongoModel;
    private waitingQueuesHistoryModel: MongoModel;
    private queuePrefix: string;

    constructor() {
        super();
        this.dataSource = new DataSource(MunicipalAuthorities.name + "DataSource",
            new HTTPProtocolStrategy({
                headers : {
                    Authorization: "Basic " + config.MOJEPRAHA_ENDPOINT_APIKEY,
                },
                method: "GET",
                url: config.datasources.MunicipalAuthorities,
            }),
            new JSONDataTypeStrategy({resultsPath: ""}),
            new Validator(MunicipalAuthorities.name + "DataSource",
                MunicipalAuthorities.datasourceMongooseSchemaObject));

        this.model = new MongoModel(MunicipalAuthorities.name + "Model", {
                identifierPath: "properties.id",
                mongoCollectionName: MunicipalAuthorities.mongoCollectionName,
                outputMongooseSchemaObject: MunicipalAuthorities.outputMongooseSchemaObject,
                resultsPath: "properties",
                savingType: "insertOrUpdate",
                searchPath: (id, multiple) => (multiple)
                    ? { "properties.id": { $in: id } }
                    : { "properties.id": id },
                updateValues: (a, b) => {
                    a.properties.name = b.properties.name;
                    a.properties.district = b.properties.district;
                    a.properties.address = b.properties.address;
                    a.properties.opening_hours = b.properties.opening_hours;
                    a.properties.telephone = b.properties.telephone;
                    a.properties.email = b.properties.email;
                    a.properties.web = b.properties.web;
                    a.properties.official_board = b.properties.official_board;
                    a.properties.type = b.properties.type;
                    a.properties.image = b.properties.image;
                    a.properties.agendas = b.properties.agendas;
                    a.properties.updated_at = b.properties.updated_at;
                    return a;
                },
            },
            new Validator(MunicipalAuthorities.name + "ModelValidator",
                MunicipalAuthorities.outputMongooseSchemaObject),
        );
        this.transformation = new MunicipalAuthoritiesTransformation();

        this.skodaPalaceQueuesDataSource = new DataSource(MunicipalAuthorities.skodaPalaceQueues.name + "DataSource",
                new HTTPProtocolStrategy({
                    headers : {},
                    method: "GET",
                    url: config.datasources.SkodaPalaceQueues,
                }),
                new XMLDataTypeStrategy({
                    resultsPath: "html.body.div",
                    xml2jsParams: { explicitArray: false, ignoreAttrs: true, trim: true },
                }),
                new Validator(MunicipalAuthorities.skodaPalaceQueues.name + "DataSource",
                    MunicipalAuthorities.skodaPalaceQueues.datasourceMongooseSchemaObject));
        this.waitingQueuesModel = new MongoModel(MunicipalAuthorities.waitingQueues.name + "Model", {
                identifierPath: "municipal_authority_id",
                mongoCollectionName: MunicipalAuthorities.waitingQueues.mongoCollectionName,
                outputMongooseSchemaObject: MunicipalAuthorities.waitingQueues.outputMongooseSchemaObject,
                savingType: "insertOrUpdate",
                searchPath: (id, multiple) => (multiple)
                    ? { municipal_authority_id: { $in: id } }
                    : { municipal_authority_id: id },
                updateValues: (a, b) => {
                    return a;
                },
            },
            new Validator(MunicipalAuthorities.waitingQueues.name + "ModelValidator",
                MunicipalAuthorities.waitingQueues.outputMongooseSchemaObject),
        );
        this.skodaPalaceQueuesTransformation = new SkodaPalaceQueuesTransformation();
        this.waitingQueuesHistoryModel = new MongoModel(MunicipalAuthorities.waitingQueues.history.name + "Model", {
                identifierPath: "municipal_authority_id",
                mongoCollectionName: MunicipalAuthorities.waitingQueues.history.mongoCollectionName,
                outputMongooseSchemaObject: MunicipalAuthorities.waitingQueues.history.outputMongooseSchemaObject,
                savingType: "insertOnly",
            },
            new Validator(MunicipalAuthorities.waitingQueues.history.name + "ModelValidator",
                MunicipalAuthorities.waitingQueues.history.outputMongooseSchemaObject),
        );
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + MunicipalAuthorities.name.toLowerCase();
    }

    public refreshDataInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSource.getAll();
        const transformedData = await this.transformation.transform(data);
        await this.model.save(transformedData);
    }

    public refreshWaitingQueues = async (msg: any): Promise<void> => {
        const data = await this.skodaPalaceQueuesDataSource.getAll();
        const transformedData = await this.skodaPalaceQueuesTransformation.transform(data);
        await this.waitingQueuesModel.save(transformedData);

        // send message for historization
        await this.sendMessageToExchange("workers." + this.queuePrefix + ".saveWaitingQueuesDataToHistory",
            new Buffer(JSON.stringify(transformedData)), { persistent: true });
    }

    public saveWaitingQueuesDataToHistory = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const transformedData = await this.skodaPalaceQueuesTransformation.transformHistory(inputData);
        await this.waitingQueuesHistoryModel.save(transformedData);
    }

}
