"use strict";

import { CityDistricts } from "golemio-schema-definitions";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, JSONDataTypeStrategy } from "../../core/datasources";
import { Validator } from "../../core/helpers";
import { MongoModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { CityDistrictsTransformation } from "./";

export class CityDistrictsWorker extends BaseWorker {

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
                modelIndexes: [{ "properties.slug": 1 }],
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
                    a.properties.updated_at = b.properties.updated_at;
                    return a;
                },
            },
            new Validator(CityDistricts.name + "ModelValidator", CityDistricts.outputMongooseSchemaObject),
        );
        this.transformation = new CityDistrictsTransformation();
    }

    public refreshDataInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSource.getAll();
        const transformedData = await this.transformation.transform(data);
        await this.model.save(transformedData);
    }

}
