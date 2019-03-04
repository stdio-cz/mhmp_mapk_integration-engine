"use strict";

import { SharedCars } from "data-platform-schema-definitions";
import DataSource from "../datasources/DataSource";
import HTTPProtocolStrategy from "../datasources/HTTPProtocolStrategy";
import JSONDataTypeStrategy from "../datasources/JSONDataTypeStrategy";
import Validator from "../helpers/Validator";
import MongoModel from "../models/MongoModel";
import CeskyCarsharingTransformation from "../transformations/CeskyCarsharingTransformation";
import HoppyGoTransformation from "../transformations/HoppyGoTransformation";
import BaseWorker from "./BaseWorker";

const config = require("../config/ConfigLoader");

export default class TrafficCamerasWorker extends BaseWorker {

    private ceskyCarsharingDataSource: DataSource;
    private hoppyGoDataSource: DataSource;
    private ceskyCarsharingTransformation: CeskyCarsharingTransformation;
    private hoppyGoTransformation: HoppyGoTransformation;
    private model: MongoModel;

    constructor() {
        super();
        this.ceskyCarsharingDataSource = new DataSource(SharedCars.ceskyCarsharing.name + "DataSource",
            new HTTPProtocolStrategy({
                body: JSON.stringify(config.datasources.CeskyCarsharingSharedCarsEndpointCredentials),
                headers: {
                    "Content-Type": "application/json",
                },
                method: "POST",
                url: config.datasources.CeskyCarsharingSharedCars,
            }),
            new JSONDataTypeStrategy({resultsPath: "cars"}),
            new Validator(SharedCars.ceskyCarsharing.name + "DataSource",
                SharedCars.ceskyCarsharing.datasourceMongooseSchemaObject));
        const hoppyGoDataType = new JSONDataTypeStrategy({resultsPath: ""});
        hoppyGoDataType.setFilter((item) => item.localization !== null);
        this.hoppyGoDataSource = new DataSource(SharedCars.hoppyGo.name + "DataSource",
            new HTTPProtocolStrategy({
                headers : {},
                method: "GET",
                url: config.datasources.HoppyGoSharedCars,
            }),
            hoppyGoDataType,
            new Validator(SharedCars.hoppyGo.name + "DataSource",
                SharedCars.hoppyGo.datasourceMongooseSchemaObject));

        this.model = new MongoModel(SharedCars.name + "Model", {
                identifierPath: "properties.id",
                modelIndexes: [{ geometry : "2dsphere" }],
                mongoCollectionName: SharedCars.mongoCollectionName,
                outputMongooseSchemaObject: SharedCars.outputMongooseSchemaObject,
                resultsPath: "properties",
                savingType: "insertOrUpdate",
                searchPath: (id, multiple) => (multiple)
                    ? { "properties.id": { $in: id } }
                    : { "properties.id": id },
                updateValues: (a, b) => {
                    a.geometry.coordinates = b.geometry.coordinates;
                    a.properties.availability = b.properties.availability;
                    a.properties.company = b.properties.company;
                    a.properties.fuel = b.properties.fuel;
                    a.properties.name = b.properties.name;
                    a.properties.res_url = b.properties.res_url;
                    a.properties.timestamp = b.properties.timestamp;
                    return a;
                },
            },
            new Validator(SharedCars.name + "ModelValidator", SharedCars.outputMongooseSchemaObject),
        );
        this.ceskyCarsharingTransformation = new CeskyCarsharingTransformation();
        this.hoppyGoTransformation = new HoppyGoTransformation();
    }

    public refreshDataInDB = async (msg: any): Promise<void> => {
        const data = await Promise.all([
            this.ceskyCarsharingDataSource.getAll(),
            this.hoppyGoDataSource.getAll(),
        ]);
        const transformedData = await Promise.all([
            this.ceskyCarsharingTransformation.transform(data[0]),
            this.hoppyGoTransformation.transform(data[1]),
        ]);
        await this.model.save(transformedData[0].concat(transformedData[1]));
    }

}
