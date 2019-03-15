"use strict";

import { CityDistricts, Parkings } from "data-platform-schema-definitions";
import DataSource from "../datasources/DataSource";
import HTTPProtocolStrategy from "../datasources/HTTPProtocolStrategy";
import JSONDataTypeStrategy from "../datasources/JSONDataTypeStrategy";
import CustomError from "../helpers/errors/CustomError";
import GeocodeApi from "../helpers/GeocodeApi";
import Validator from "../helpers/Validator";
import MongoModel from "../models/MongoModel";
import ParkingsTransformation from "../transformations/ParkingsTransformation";
import BaseWorker from "./BaseWorker";

const config = require("../config/ConfigLoader");
const moment = require("moment");

export default class ParkingsWorker extends BaseWorker {

    private dataSource: DataSource;
    private transformation: ParkingsTransformation;
    private model: MongoModel;
    private historyModel: MongoModel;
    private queuePrefix: string;
    private cityDistrictsModel: MongoModel;

    constructor() {
        super();
        this.dataSource = new DataSource(Parkings.name + "DataSource",
            new HTTPProtocolStrategy({
                headers : {},
                method: "GET",
                url: config.datasources.TSKParkings,
            }),
            new JSONDataTypeStrategy({resultsPath: "results"}),
            new Validator(Parkings.name + "DataSource", Parkings.datasourceMongooseSchemaObject));
        this.model = new MongoModel(Parkings.name + "Model", {
                identifierPath: "properties.id",
                modelIndexes: [{ geometry : "2dsphere" },
                    { "properties.name": "text", "properties.address": "text" },
                        {weights: { "properties.name": 5, "properties.address": 1 }}],
                mongoCollectionName: Parkings.mongoCollectionName,
                outputMongooseSchemaObject: Parkings.outputMongooseSchemaObject,
                resultsPath: "properties",
                savingType: "insertOrUpdate",
                searchPath: (id, multiple) => (multiple)
                    ? { "properties.id": { $in: id } }
                    : { "properties.id": id },
                updateValues: (a, b) => {
                    a.properties.name = b.properties.name;
                    a.properties.num_of_free_places = b.properties.num_of_free_places;
                    a.properties.num_of_taken_places = b.properties.num_of_taken_places;
                    a.properties.total_num_of_places = b.properties.total_num_of_places;
                    a.properties.parking_type = b.properties.parking_type;
                    a.properties.timestamp = b.properties.timestamp;
                    return a;
                },
            },
            new Validator(Parkings.name + "ModelValidator", Parkings.outputMongooseSchemaObject),
        );
        this.transformation = new ParkingsTransformation();
        this.historyModel = new MongoModel(Parkings.history.name + "Model", {
                mongoCollectionName: Parkings.history.mongoCollectionName,
                outputMongooseSchemaObject: Parkings.history.outputMongooseSchemaObject,
                savingType: "insertOnly",
            },
            new Validator(Parkings.history.name + "ModelValidator", Parkings.history.outputMongooseSchemaObject),
        );
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + Parkings.name.toLowerCase();
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
            this.sendMessageToExchange("workers." + this.queuePrefix + ".updateAverageOccupancy",
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

    public updateAverageOccupancy = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const id = inputData.properties.id;
        const dbData = await this.model.findOneById(id);
        const timestampMonthAgo = moment().subtract(1, "months").unix();

        const aggregation = [
            { $match: { $and: [ { id }, { timestamp: { $gte: timestampMonthAgo }} ] }},
            {
                $group: {
                    _id: {
                        dayOfWeek: {
                            $subtract: [ {$dayOfWeek: { $toDate: "$timestamp" }}, 1 ],
                        },
                        hour: {
                            $dateToString: {
                                date: {
                                    $toDate: "$timestamp",
                                },
                                format: "%H",
                            },
                        },
                        parking_id: "$id",
                    },
                    avg_taken: {
                        $avg: "$num_of_taken_places",
                    },
                },
            },
            { $sort: { "_id.dayOfWeek": 1, "_id.hour": 1 } },
        ];

        try {
            const result = await this.historyModel.aggregate(aggregation);
            const transformedResult = {};
            const promises = result.map(async (r) => {
                if (!transformedResult[r._id.dayOfWeek]) {
                    transformedResult[r._id.dayOfWeek] = {};
                }
                transformedResult[r._id.dayOfWeek][r._id.hour] = (r.avg_taken) ? r.avg_taken : null;
            });
            await Promise.all(promises);
            dbData.properties.average_occupancy = transformedResult;
            await dbData.save();
        } catch (err) {
            throw new CustomError("Error while updating average taken places.",
                true, this.constructor.name, 1019, err);
        }
    }

}
