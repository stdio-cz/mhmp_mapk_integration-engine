"use strict";

import { CityDistricts } from "data-platform-schema-definitions";
import DataSource from "../datasources/DataSource";
import HTTPProtocolStrategy from "../datasources/HTTPProtocolStrategy";
import JSONDataTypeStrategy from "../datasources/JSONDataTypeStrategy";
import Validator from "../helpers/Validator";
import MongoModel from "../models/MongoModel";
import CityDistrictsTransformation from "../transformations/CityDistrictsTransformation";
import BaseWorker from "./BaseWorker";

const config = require("../config/ConfigLoader");

export default class CityDistrictsWorker extends BaseWorker {

    private model: MongoModel;
    private dataSource: DataSource;
    private transformation: CityDistrictsTransformation;

    constructor() {
        super();
        this.dataSource = new DataSource(CityDistricts.name + "DataSource",
            new HTTPProtocolStrategy({
                headers : {},
                method: "GET",
                url: config.datasources.CityDistricts,
            }),
            new JSONDataTypeStrategy({resultsPath: "features"}),
            new Validator(CityDistricts.name + "DataSourceValidator", CityDistricts.datasourceMongooseSchemaObject));
        this.model = new MongoModel(CityDistricts.name + "Model", {
                identifierPath: "properties.id",
                mongoCollectionName: CityDistricts.mongoCollectionName,
                outputMongooseSchemaObject: CityDistricts.outputMongooseSchemaObject,
                resultsPath: "properties",
                savingType: "insertOrUpdate",
                searchPath: (id, multiple) => (multiple)
                    ? { "properties.id": { $in: id } }
                    : { "properties.id": id },
                updateValues: (a, b) => {
                    a.geometry.coordinates = b.geometry.coordinates;
                    a.properties.name = b.properties.name;
                    a.properties.slug = b.properties.slug;
                    a.properties.timestamp = b.properties.timestamp;
                    return a;
                },
            },
            new Validator(CityDistricts.name + "ModelValidator", CityDistricts.outputMongooseSchemaObject),
        );
        this.transformation = new CityDistrictsTransformation();
    }

    public refreshDataInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSource.getAll();
        const transformedData = await this.transformation.TransformDataCollection(data);
        await this.model.save(transformedData.features); // TODO dat pryc pridavani GeoJSON obalky ve transformaci
    }

}
