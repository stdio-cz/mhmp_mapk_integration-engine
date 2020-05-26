"use strict";

import * as  JSONStream from "JSONStream";

import { DataSourceStream } from "../../core/datasources/DataSourceStream";

import { CustomError } from "@golemio/errors";
import { CityDistricts, Meteosensors } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import { config } from "../../core/config";
import { DataSourceStreamed, HTTPProtocolStrategyStreamed, JSONDataTypeStrategy } from "../../core/datasources";
import { MongoModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { MeteosensorsTransformation } from "./";

export class MeteosensorsWorker extends BaseWorker {

    private dataSource: DataSourceStreamed;
    private dataStream: DataSourceStream;
    private transformation: MeteosensorsTransformation;
    private model: MongoModel;
    private historyModel: MongoModel;
    private queuePrefix: string;
    private cityDistrictsModel: MongoModel;

    constructor() {
        super();
        const dataTypeStrategy = new JSONDataTypeStrategy({ resultsPath: "" });
        // filter items with lastUpdated lower than two days
        dataTypeStrategy.setFilter((item) => item.lastUpdated > new Date().getTime() - (2 * 24 * 60 * 60 * 1000));
        const HTTPProtocolStrategy = new HTTPProtocolStrategyStreamed({
            headers: {},
            method: "GET",
            url: config.datasources.TSKMeteosensors,
        });

        HTTPProtocolStrategy.setStreamTransformer(JSONStream.parse("results.*"));

        this.dataSource = new DataSourceStreamed(
            Meteosensors.name + "DataSource",
            HTTPProtocolStrategy,
            dataTypeStrategy,
            new Validator(Meteosensors.name + "DataSource", Meteosensors.datasourceMongooseSchemaObject),
        );

        this.model = new MongoModel(Meteosensors.name + "Model", {
            identifierPath: "properties.id",
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
        {
            // TO DO - move to hejper f-cion
            let processing = false;

            try {
                this.dataStream = (await this.dataSource.getAll(true));
            } catch (err) {
                throw new CustomError("Error while getting data.", true, this.constructor.name, 5050, err);
            }
            this.dataStream.onDataListeners.push(async (data: any) => {
                this.dataStream.pause();
                processing = true;

                const transformedData = await this.transformation.transform(data);

                await this.model.save(transformedData);

                // send message for historization
                await this.sendMessageToExchange("workers." + this.queuePrefix + ".saveDataToHistory",
                JSON.stringify(transformedData), { persistent: true });

                // send messages for updating district and address and average occupancy
                const promises = transformedData.map((p) => {
                    this.sendMessageToExchange("workers." + this.queuePrefix + ".updateDistrict",
                        JSON.stringify(p));
                });

                await Promise.all(promises);

                processing = false;

                this.dataStream.resume();
            });

            // attach data listeners => start processing data
            this.dataSource.proceed();

            try {
                // wait for stream to finish to report end
                await new Promise((resolve, reject) => {
                    this.dataStream.on("error", (error) => reject(error));
                    this.dataStream.on("end", async () => {
                        const checker = setInterval( async () => {
                            if (!processing) {
                                clearInterval(checker);
                                resolve();
                            }
                        }, 100);
                    });
                });
            } catch (err) {
                throw new CustomError("Error processing data.", true, this.constructor.name, 5051, err);
            }
        }
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
                throw new CustomError("Error while updating district.", true, this.constructor.name, 5001, err);
            }
        }
        return dbData;
    }

}
