"use strict";

import { CityDistricts, Meteosensors } from "golemio-schema-definitions";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, JSONDataTypeStrategy } from "../../core/datasources";
import { Validator } from "../../core/helpers";
import { CustomError } from "../../core/helpers/errors";
import { MongoModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { MeteosensorsTransformation } from "./";

export class MeteosensorsWorker extends BaseWorker {

    private dataSource: DataSource;
    private transformation: MeteosensorsTransformation;
    private model: MongoModel;
    private historyModel: MongoModel;
    private queuePrefix: string;
    private cityDistrictsModel: MongoModel;

    constructor() {
        super();
        const dataTypeStrategy = new JSONDataTypeStrategy({resultsPath: "results"});
        // filter items with lastUpdated lower than two days
        dataTypeStrategy.setFilter((item) => item.lastUpdated > new Date().getTime() - (2 * 24 * 60 * 60 * 1000));
        this.dataSource = new DataSource(Meteosensors.name + "DataSource",
            new HTTPProtocolStrategy({
                headers: {},
                method: "GET",
                url: config.datasources.TSKMeteosensors,
            }),
            dataTypeStrategy,
            new Validator(Meteosensors.name + "DataSource", Meteosensors.datasourceMongooseSchemaObject));
        this.model = new MongoModel(Meteosensors.name + "Model", {
                identifierPath: "properties.id",
                modelIndexes: [{ geometry: "2dsphere" }],
                mongoCollectionName: Meteosensors.mongoCollectionName,
                outputMongooseSchemaObject: Meteosensors.outputMongooseSchemaObject,
                resultsPath: "properties",
                savingType: "insertOrUpdate",
                searchPath: (id, multiple) => (multiple)
                    ? { "properties.id": { $in: id } }
                    : { "properties.id": id },
                updateValues: (a, b) => {
                    a.properties.name = b.properties.name;
                    a.properties.last_updated = b.properties.last_updated;
                    a.properties.air_temperature = b.properties.air_temperature;
                    a.properties.road_temperature = b.properties.road_temperature;
                    a.properties.humidity = b.properties.humidity;
                    a.properties.wind_direction = b.properties.wind_direction;
                    a.properties.wind_speed = b.properties.wind_speed;
                    a.properties.updated_at = b.properties.updated_at;
                    return a;
                },
            },
            new Validator(Meteosensors.name + "ModelValidator", Meteosensors.outputMongooseSchemaObject),
        );
        this.transformation = new MeteosensorsTransformation();
        this.historyModel = new MongoModel(Meteosensors.history.name + "Model", {
                identifierPath: "id",
                mongoCollectionName: Meteosensors.history.mongoCollectionName,
                outputMongooseSchemaObject: Meteosensors.history.outputMongooseSchemaObject,
                savingType: "insertOnly",
            },
            new Validator(Meteosensors.history.name + "ModelValidator",
                Meteosensors.history.outputMongooseSchemaObject),
        );
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + Meteosensors.name.toLowerCase();
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
