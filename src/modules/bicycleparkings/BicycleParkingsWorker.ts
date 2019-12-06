"use strict";

import { CustomError } from "@golemio/errors";
import { BicycleParkings, CityDistricts } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, JSONDataTypeStrategy } from "../../core/datasources";
import { MongoModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { BicycleParkingsTransformation } from "./";

export class BicycleParkingsWorker extends BaseWorker {

    private dataSource: DataSource;
    private transformation: BicycleParkingsTransformation;
    private model: MongoModel;
    private queuePrefix: string;
    private cityDistrictsModel: MongoModel;

    constructor() {
        super();
        this.dataSource = new DataSource(BicycleParkings.name + "DataSource",
            new HTTPProtocolStrategy({
                headers: {},
                method: "GET",
                url: config.datasources.BicycleParkings,
            }),
            new JSONDataTypeStrategy({ resultsPath: "elements" }),
            new Validator(BicycleParkings.name + "DataSource",
                BicycleParkings.datasourceMongooseSchemaObject));
        this.model = new MongoModel(BicycleParkings.name + "Model", {
            identifierPath: "properties.id",
            mongoCollectionName: BicycleParkings.mongoCollectionName,
            outputMongooseSchemaObject: BicycleParkings.outputMongooseSchemaObject,
            resultsPath: "properties",
            savingType: "insertOrUpdate",
            searchPath: (id, multiple) => (multiple)
                ? { "properties.id": { $in: id } }
                : { "properties.id": id },
            updateValues: (a, b) => {
                a.properties.tags = b.properties.tags;
                a.properties.updated_at = b.properties.updated_at;
                return a;
            },
        },
            new Validator(BicycleParkings.name + "ModelValidator", BicycleParkings.outputMongooseSchemaObject),
        );
        this.transformation = new BicycleParkingsTransformation();

        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + BicycleParkings.name.toLowerCase();
        this.cityDistrictsModel = new MongoModel(CityDistricts.name + "Model", {
            identifierPath: "properties.id",
            mongoCollectionName: CityDistricts.mongoCollectionName,
            outputMongooseSchemaObject: CityDistricts.outputMongooseSchemaObject,
            resultsPath: "properties",
            savingType: "readOnly",
            searchPath: (id, multiple) => (multiple)
                ? { "properties.id": { $in: id } }
                : { "properties.id": id },
        },
            new Validator(CityDistricts.name + "ModelValidator", CityDistricts.outputMongooseSchemaObject),
        );
    }

    public refreshDataInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSource.getAll();
        const transformedData = await this.transformation.transform(data);
        await this.model.save(transformedData);

        // send messages for updating district and address and average occupancy
        const promises = transformedData.map((p) => {
            this.sendMessageToExchange("workers." + this.queuePrefix + ".updateDistrict",
                JSON.stringify(p));
        });
        await Promise.all(promises);
    }

    public updateDistrict = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const id = inputData.properties.id;
        const dbData = await this.model.findOneById(id);

        if (!dbData.properties.district
            || inputData.geometry.coordinates[0] !== dbData.geometry.coordinates[0]
            || inputData.geometry.coordinates[1] !== dbData.geometry.coordinates[1]) {
            try {
                const result = await this.cityDistrictsModel.findOne({ // find district by coordinates
                    geometry: {
                        $geoIntersects: {
                            $geometry: {
                                coordinates: dbData.geometry.coordinates,
                                type: "Point",
                            },
                        },
                    },
                });
                dbData.properties.district = (result) ? result.properties.slug : null;
                await dbData.save();
            } catch (err) {
                throw new CustomError("Error while updating district.", true, this.constructor.name, 5001, err);
            }
        }
        return dbData;
    }

}
