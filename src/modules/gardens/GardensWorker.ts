"use strict";

import { Gardens } from "data-platform-schema-definitions";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, JSONDataTypeStrategy } from "../../core/datasources";
import { Validator } from "../../core/helpers";
import { MongoModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { GardensTransformation } from "./";

export class GardensWorker extends BaseWorker {

    private dataSource: DataSource;
    private transformation: GardensTransformation;
    private model: MongoModel;

    constructor() {
        super();
        this.dataSource = new DataSource(Gardens.name + "DataSource",
            new HTTPProtocolStrategy({
                headers : {
                    Authorization: "Basic " + config.MOJEPRAHA_ENDPOINT_APIKEY,
                },
                method: "GET",
                url: config.datasources.Gardens,
            }),
            new JSONDataTypeStrategy({resultsPath: ""}),
            new Validator(Gardens.name + "DataSource", Gardens.datasourceMongooseSchemaObject));
        this.model = new MongoModel(Gardens.name + "Model", {
                identifierPath: "properties.id",
                modelIndexes: [{ geometry : "2dsphere" },
                    { "properties.name": "text", "properties.address": "text", "properties.description": "text" },
                    { weights: { "properties.name": 5, "properties.address": 1, "properties.description": 5 }} ],
                mongoCollectionName: Gardens.mongoCollectionName,
                outputMongooseSchemaObject: Gardens.outputMongooseSchemaObject,
                resultsPath: "properties",
                savingType: "insertOrUpdate",
                searchPath: (id, multiple) => (multiple)
                    ? { "properties.id": { $in: id } }
                    : { "properties.id": id },
                updateValues: (a, b) => {
                    a.properties.name = b.properties.name;
                    a.properties.image = b.properties.image;
                    a.properties.description = b.properties.description;
                    a.properties.url = b.properties.url;
                    a.properties.address = b.properties.address;
                    a.properties.district = b.properties.district;
                    a.properties.properties = b.properties.properties;
                    a.properties.timestamp = b.properties.timestamp;
                    return a;
                },
            },
            new Validator(Gardens.name + "ModelValidator", Gardens.outputMongooseSchemaObject),
        );
        this.transformation = new GardensTransformation();
    }

    public refreshDataInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSource.getAll();
        const transformedData = await this.transformation.transform(data);
        await this.model.save(transformedData);
    }

}
