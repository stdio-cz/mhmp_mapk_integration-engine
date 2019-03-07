"use strict";

import { CityDistricts, TrafficCameras } from "data-platform-schema-definitions";
import DataSource from "../datasources/DataSource";
import HTTPProtocolStrategy from "../datasources/HTTPProtocolStrategy";
import JSONDataTypeStrategy from "../datasources/JSONDataTypeStrategy";
import CustomError from "../helpers/errors/CustomError";
import GeocodeApi from "../helpers/GeocodeApi";
import Validator from "../helpers/Validator";
import MongoModel from "../models/MongoModel";
import TrafficCamerasTransformation from "../transformations/TrafficCamerasTransformation";
import BaseWorker from "./BaseWorker";

const config = require("../config/ConfigLoader");

export default class TrafficCamerasWorker extends BaseWorker {

    private dataSource: DataSource;
    private transformation: TrafficCamerasTransformation;
    private model: MongoModel;
    private historyModel: MongoModel;
    private queuePrefix: string;
    private cityDistrictsModel: MongoModel;

    constructor() {
        super();
        this.dataSource = new DataSource(TrafficCameras.name + "DataSource",
            new HTTPProtocolStrategy({
                headers : {},
                method: "GET",
                url: config.datasources.TSKTrafficCameras,
            }),
            new JSONDataTypeStrategy({resultsPath: "results"}),
            new Validator(TrafficCameras.name + "DataSource", TrafficCameras.datasourceMongooseSchemaObject));
        this.model = new MongoModel(TrafficCameras.name + "Model", {
                identifierPath: "properties.id",
                modelIndexes: [{ geometry : "2dsphere" },
                    { "properties.name": "text", "properties.address": "text" },
                        { weights: { "properties.name": 5, "properties.address": 1 }}],
                mongoCollectionName: TrafficCameras.mongoCollectionName,
                outputMongooseSchemaObject: TrafficCameras.outputMongooseSchemaObject,
                resultsPath: "properties",
                savingType: "insertOrUpdate",
                searchPath: (id, multiple) => (multiple)
                    ? { "properties.id": { $in: id } }
                    : { "properties.id": id },
                updateValues: (a, b) => {
                    a.properties.image = b.properties.image;
                    a.properties.last_updated = b.properties.last_updated;
                    a.properties.name = b.properties.name;
                    a.properties.timestamp = b.properties.timestamp;
                    return a;
                },
            },
            new Validator(TrafficCameras.name + "ModelValidator", TrafficCameras.outputMongooseSchemaObject),
        );
        this.transformation = new TrafficCamerasTransformation();
        this.historyModel = new MongoModel(TrafficCameras.history.name + "Model", {
                mongoCollectionName: TrafficCameras.history.mongoCollectionName,
                outputMongooseSchemaObject: TrafficCameras.history.outputMongooseSchemaObject,
                savingType: "insertOnly",
            },
            new Validator(TrafficCameras.history.name + "ModelValidator",
                TrafficCameras.history.outputMongooseSchemaObject),
        );
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + TrafficCameras.name.toLowerCase();
        this.cityDistrictsModel = new MongoModel(CityDistricts.name + "Model", {
                identifierPath: "properties.id",
                mongoCollectionName: CityDistricts.mongoCollectionName,
                outputMongooseSchemaObject: CityDistricts.outputMongooseSchemaObject,
                resultsPath: "properties",
                savingType: "insertOrUpdate",
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
                throw new CustomError("Error while updating district.", true, this.constructor.name, 1015, err);
            }
        }

        if (!dbData.properties.address
                || inputData.geometry.coordinates[0] !== dbData.geometry.coordinates[0]
                || inputData.geometry.coordinates[1] !== dbData.geometry.coordinates[1]) {
            try {
                const address = await GeocodeApi.getAddressByLatLng(dbData.geometry.coordinates[1],
                    dbData.geometry.coordinates[0]);
                dbData.properties.address = address;
                await dbData.save();
            } catch (err) {
                throw new CustomError("Error while updating adress.", true, this.constructor.name, 1016, err);
            }
        }
        return dbData;
    }

}
