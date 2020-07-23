"use strict";

import { CustomError } from "@golemio/errors";
import { CityDistricts, MunicipalLibraries } from "@golemio/schema-definitions";
import { JSONSchemaValidator, Validator } from "@golemio/validator";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, XMLDataTypeStrategy } from "../../core/datasources";
import { MongoModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { MunicipalLibrariesTransformation } from "./";

export class MunicipalLibrariesWorker extends BaseWorker {

    private dataSource: DataSource;
    private transformation: MunicipalLibrariesTransformation;
    private model: MongoModel;
    private queuePrefix: string;
    private cityDistrictsModel: MongoModel;

    constructor() {
        super();
        this.dataSource = new DataSource(MunicipalLibraries.name + "DataSource",
            new HTTPProtocolStrategy({
                headers: {},
                method: "GET",
                url: config.datasources.MunicipalLibraries,
            }),
            new XMLDataTypeStrategy({
                resultsPath: "pobocky.pobocka",
                xml2jsParams: { explicitArray: false, ignoreAttrs: true, trim: true },
            }),
            new JSONSchemaValidator(
                MunicipalLibraries.name + "DataSource",
                MunicipalLibraries.datasourceJsonSchema,
            ),
        );

        this.model = new MongoModel(MunicipalLibraries.name + "Model",
            {
                identifierPath: "properties.id",
                mongoCollectionName: MunicipalLibraries.mongoCollectionName,
                outputMongooseSchemaObject: MunicipalLibraries.outputMongooseSchemaObject,
                resultsPath: "properties",
                savingType: "insertOrUpdate",
                searchPath: (id, multiple) => (multiple)
                    ? { "properties.id": { $in: id } }
                    : { "properties.id": id },
                updateValues: (a, b) => {
                    a.geometry = b.geometry;
                    a.properties.address = b.properties.address;
                    a.properties.email = b.properties.email;
                    a.properties.name = b.properties.name;
                    a.properties.opening_hours = b.properties.opening_hours;
                    a.properties.sections_and_departments = b.properties.sections_and_departments;
                    a.properties.services = b.properties.services;
                    a.properties.telephone = b.properties.telephone;
                    a.properties.updated_at = b.properties.updated_at;
                    a.properties.web = b.properties.web;
                    return a;
                },
            },
            new Validator(MunicipalLibraries.name + "ModelValidator",
                MunicipalLibraries.outputMongooseSchemaObject),
        );
        this.transformation = new MunicipalLibrariesTransformation();
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + MunicipalLibraries.name.toLowerCase();
        this.cityDistrictsModel = new MongoModel(CityDistricts.name + "Model",
            {
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
