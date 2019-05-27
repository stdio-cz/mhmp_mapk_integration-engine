"use strict";

import { AirQualityStations, CityDistricts } from "golemio-schema-definitions";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, XMLDataTypeStrategy } from "../../core/datasources";
import { Validator } from "../../core/helpers";
import { CustomError } from "../../core/helpers/errors";
import { MongoModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { AirQualityStationsTransformation } from "./";

export class AirQualityStationsWorker extends BaseWorker {

    private dataSource: DataSource;
    private transformation: AirQualityStationsTransformation;
    private model: MongoModel;
    private historyModel: MongoModel;
    private queuePrefix: string;
    private cityDistrictsModel: MongoModel;

    constructor() {
        super();
        const stationsDataType = new XMLDataTypeStrategy({
            resultsPath: "AQ_hourly_index.Data.station",
            xml2jsParams: { explicitArray: false, trim: true },
        });
        stationsDataType.setFilter((item) => item.code[0].indexOf("A") === 0);
        this.dataSource = new DataSource(AirQualityStations.name + "DataSource",
            new HTTPProtocolStrategy({
                headers: {},
                method: "GET",
                url: config.datasources.AirQualityStations,
            }),
            stationsDataType,
            new Validator(AirQualityStations.name + "DataSource",
                AirQualityStations.datasourceMongooseSchemaObject));
        this.model = new MongoModel(AirQualityStations.name + "Model", {
                identifierPath: "properties.id",
                modelIndexes: [{ geometry: "2dsphere" }],
                mongoCollectionName: AirQualityStations.mongoCollectionName,
                outputMongooseSchemaObject: AirQualityStations.outputMongooseSchemaObject,
                resultsPath: "properties",
                savingType: "insertOrUpdate",
                searchPath: (id, multiple) => (multiple)
                    ? { "properties.id": { $in: id } }
                    : { "properties.id": id },
                updateValues: (a, b) => {
                    a.properties.name = b.properties.name;
                    a.properties.measurement = b.properties.measurement;
                    a.properties.updated_at = b.properties.updated_at;
                    return a;
                },
            },
            new Validator(AirQualityStations.name + "ModelValidator", AirQualityStations.outputMongooseSchemaObject),
        );
        this.transformation = new AirQualityStationsTransformation();
        this.historyModel = new MongoModel(AirQualityStations.history.name + "Model", {
                identifierPath: "id",
                mongoCollectionName: AirQualityStations.history.mongoCollectionName,
                outputMongooseSchemaObject: AirQualityStations.history.outputMongooseSchemaObject,
                savingType: "insertOnly",
            },
            new Validator(AirQualityStations.history.name + "ModelValidator",
                AirQualityStations.history.outputMongooseSchemaObject),
        );
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + AirQualityStations.name.toLowerCase();
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

        // send message for historization
        await this.sendMessageToExchange("workers." + this.queuePrefix + ".saveDataToHistory",
            new Buffer(JSON.stringify(transformedData)), { persistent: true });

        // send messages for updating district and address and average occupancy
        const promises = transformedData.map((p) => {
            this.sendMessageToExchange("workers." + this.queuePrefix + ".updateDistrict",
                new Buffer(JSON.stringify(p)));
        });
        await Promise.all(promises);
    }

    public saveDataToHistory = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const transformedData = await this.transformation.transformHistory(inputData);
        await this.historyModel.save(transformedData);
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
                throw new CustomError("Error while updating district.", true, this.constructor.name, 1015, err);
            }
        }
        return dbData;
    }

}
