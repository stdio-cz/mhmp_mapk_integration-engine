"use strict";

import { MunicipalAuthorities } from "golemio-schema-definitions";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, JSONDataTypeStrategy } from "../../core/datasources";
import { Validator } from "../../core/helpers";
import { MongoModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { MunicipalAuthoritiesTransformation } from "./";

export class MunicipalAuthoritiesWorker extends BaseWorker {

    private dataSource: DataSource;
    private transformation: MunicipalAuthoritiesTransformation;
    private model: MongoModel;

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
                modelIndexes: [
                    { "properties.type": 1 },
                    { geometry : "2dsphere" },
                    {
                        "properties.address": "text",
                        "properties.agendas.description": "text",
                        "properties.agendas.keywords": "text",
                        "properties.name": "text",
                    },
                    {
                        name: "textindex1",
                        weights: {
                            "properties.address": 1,
                            "properties.agendas.description": 5,
                            "properties.agendas.keywords": 5,
                            "properties.name": 5,
                        },
                    },
                ],
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
                    a.properties.timestamp = b.properties.timestamp;
                    return a;
                },
            },
            new Validator(MunicipalAuthorities.name + "ModelValidator",
                MunicipalAuthorities.outputMongooseSchemaObject),
        );
        this.transformation = new MunicipalAuthoritiesTransformation();
    }

    public refreshDataInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSource.getAll();
        const transformedData = await this.transformation.transform(data);
        await this.model.save(transformedData);
    }

}
