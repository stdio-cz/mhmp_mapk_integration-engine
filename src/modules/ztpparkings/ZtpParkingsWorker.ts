"use strict";

import { CustomError } from "@golemio/errors";
import { CityDistricts, ZtpParkings } from "@golemio/schema-definitions";
import { ObjectKeysValidator, Validator } from "@golemio/validator";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, JSONDataTypeStrategy } from "../../core/datasources";
import { GeocodeApi } from "../../core/helpers";
import { MongoModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { ZtpParkingsInputTransformation, ZtpParkingsTransformation } from "./";

import * as moment from "moment";

export class ZtpParkingsWorker extends BaseWorker {

    private dataSource: DataSource;
    private transformation: ZtpParkingsTransformation;
    private inputTransformation: ZtpParkingsInputTransformation;
    private model: MongoModel;
    private historyModel: MongoModel;
    private queuePrefix: string;
    private cityDistrictsModel: MongoModel;

    constructor() {
        super();
        const dataTypeStrategy = new JSONDataTypeStrategy({ resultsPath: "data" });
        // filter items with lastUpdated lower than two days
        // dataTypeStrategy.setFilter((item) => item.lastUpdated > new Date().getTime() - (2 * 24 * 60 * 60 * 1000));
        this.dataSource = new DataSource(ZtpParkings.name + "DataSource",
            new HTTPProtocolStrategy({
                headers: {
                    user_key: config.datasources.TSKZtpParkingsToken,
                },
                method: "GET",
                url: config.datasources.TSKZtpParkings,
            }),
            dataTypeStrategy,
            new ObjectKeysValidator(ZtpParkings.name + "DataSource", ZtpParkings.datasourceMongooseSchemaObject));
        this.model = new MongoModel(ZtpParkings.name + "Model", {
            identifierPath: "properties.id",
            mongoCollectionName: ZtpParkings.mongoCollectionName,
            outputMongooseSchemaObject: ZtpParkings.outputMongooseSchemaObject,
            resultsPath: "properties",
            savingType: "insertOrUpdate",
            searchPath: (id, multiple) => (multiple)
                ? { "properties.id": { $in: id } }
                : { "properties.id": id },
            updateValues: (a, b) => {
                a.properties.active = a.properties.active;
                // a.properties.address = b.properties.address;
                a.properties.device_id = b.properties.device_id;
                // a.properties.district = b.properties.district;
                a.properties.failure = b.properties.failure;
                a.properties.group = b.properties.group;
                a.properties.id_group = b.properties.id_group;
                a.properties.id_park = b.properties.id_park;
                a.properties.id_space = b.properties.id_space;
                a.properties.image_name = b.properties.image_name;
                a.properties.image_src = b.properties.image_src;
                a.properties.last_updated_at = b.properties.last_updated_at;
                a.properties.location = b.properties.location;
                a.properties.master = b.properties.master;
                a.properties.note = b.properties.note;
                a.properties.occupied = b.properties.occupied;
                a.properties.signal_rssi0 = b.properties.signal_rssi0;
                a.properties.signal_rssi1 = b.properties.signal_rssi1;
                a.properties.size = b.properties.size;
                a.properties.source = b.properties.source;
                a.properties.surface = b.properties.surface;
                a.properties.temperature = b.properties.temperature;
                a.properties.type = b.properties.type;
                a.properties.updated_at = b.properties.updated_at;
                return a;
            },
        },
            new Validator(ZtpParkings.name + "ModelValidator", ZtpParkings.outputMongooseSchemaObject),
        );
        this.transformation = new ZtpParkingsTransformation();
        this.inputTransformation = new ZtpParkingsInputTransformation();
        this.historyModel = new MongoModel(ZtpParkings.history.name + "Model", {
            identifierPath: "id",
            mongoCollectionName: ZtpParkings.history.mongoCollectionName,
            outputMongooseSchemaObject: ZtpParkings.history.outputMongooseSchemaObject,
            savingType: "insertOnly",
        },
            new Validator(ZtpParkings.history.name + "ModelValidator", ZtpParkings.history.outputMongooseSchemaObject),
        );
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + ZtpParkings.name.toLowerCase();
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

    // from cron tasks
    public refreshDataInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSource.getAll();
        const transformedData = await this.transformation.transform(data);
        await this.model.save(transformedData);

        // send message for historization
        await this.sendMessageToExchange("workers." + this.queuePrefix + ".saveDataToHistory",
            new Buffer(JSON.stringify(transformedData)), { persistent: true });

        // send messages for updating district and address and average occupancy
        const promises = transformedData.map((p) => {
            this.sendMessageToExchange("workers." + this.queuePrefix + ".updateAddressAndDistrict",
                new Buffer(JSON.stringify(p)));
        });
        await Promise.all(promises);
    }

    public saveDataToHistory = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const transformedData = await this.transformation.transformHistory(inputData);
        await this.historyModel.save(transformedData);
    }

    public updateAddressAndDistrict = async (msg: any): Promise<void> => {
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

        if (!dbData.properties.address || !dbData.properties.address.address_formatted
            || inputData.geometry.coordinates[0] !== dbData.geometry.coordinates[0]
            || inputData.geometry.coordinates[1] !== dbData.geometry.coordinates[1]) {
            try {
                const address = await GeocodeApi.getAddressByLatLng(dbData.geometry.coordinates[1],
                    dbData.geometry.coordinates[0]);
                dbData.properties.address = address;
                await dbData.save();
            } catch (err) {
                throw new CustomError("Error while updating adress.", true, this.constructor.name, 5001, err);
            }
        }
        return dbData;
    }

    public updateStatusAndDevice = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const transformedData = await this.inputTransformation.transform(inputData);
        const id = transformedData.properties.id;
        const dbData = await this.model.findOneById(id);

        try {
            dbData.properties.device_id = transformedData.properties.device_id;
            dbData.properties.failure = transformedData.properties.failure;
            dbData.properties.last_updated_at = transformedData.properties.last_updated_at;
            dbData.properties.occupied = transformedData.properties.occupied;

            await dbData.save();
        } catch (err) {
            throw new CustomError("Error while updating status and device.",
                true, this.constructor.name, 5001, err);
        }

        // send message for historization
        await this.sendMessageToExchange("workers." + this.queuePrefix + ".saveDataToHistory",
            new Buffer(JSON.stringify(transformedData)), { persistent: true });
    }

}
