"use strict";

import { SharedCars } from "golemio-schema-definitions";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, JSONDataTypeStrategy } from "../../core/datasources";
import { Validator } from "../../core/helpers";
import { MongoModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { CeskyCarsharingTransformation, HoppyGoTransformation } from "./";

const cheapruler = require("cheap-ruler");
const ruler = cheapruler(50);

export class SharedCarsWorker extends BaseWorker {

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
        hoppyGoDataType.setFilter((item) => item.localization);
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
                    a.properties.updated_at = b.properties.updated_at;
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

        // filter the objects 18 km far from the center of Prague
        const filteredData = transformedData[0].concat(transformedData[1]).filter((item) => {
            // distance from center of Prague
            const distance = ruler.distance([14.463401734828949, 50.06081863605803], item.geometry.coordinates);
            return distance < 18;
        });
        await this.model.save(filteredData);
    }

}
