"use strict";

import { CustomError } from "@golemio/errors";
import { CityDistricts, Parkings } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, JSONDataTypeStrategy } from "../../core/datasources";
import { GeocodeApi } from "../../core/helpers";
import { MongoModel, PostgresModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { ParkingsOccupanciesTransformation, ParkingsTransformation } from "./";

import * as moment from "moment";

export class ParkingsWorker extends BaseWorker {

    private dataSource: DataSource;
    private transformation: ParkingsTransformation;
    private model: MongoModel;
    private historyModel: MongoModel;
    private queuePrefix: string;
    private cityDistrictsModel: MongoModel;
    private occupanciesTransformation: ParkingsOccupanciesTransformation;
    private occupanciesModel: PostgresModel;

    constructor() {
        super();
        const dataTypeStrategy = new JSONDataTypeStrategy({ resultsPath: "results" });
        // filter items with lastUpdated lower than two days
        dataTypeStrategy.setFilter((item) => item.lastUpdated > new Date().getTime() - (2 * 24 * 60 * 60 * 1000));
        this.dataSource = new DataSource(Parkings.name + "DataSource",
            new HTTPProtocolStrategy({
                headers: {},
                method: "GET",
                url: config.datasources.TSKParkings,
            }),
            dataTypeStrategy,
            new Validator(Parkings.name + "DataSource", Parkings.datasourceMongooseSchemaObject));
        this.model = new MongoModel(Parkings.name + "Model", {
            identifierPath: "properties.id",
            mongoCollectionName: Parkings.mongoCollectionName,
            outputMongooseSchemaObject: Parkings.outputMongooseSchemaObject,
            resultsPath: "properties",
            savingType: "insertOrUpdate",
            searchPath: (id, multiple) => (multiple)
                ? { "properties.id": { $in: id } }
                : { "properties.id": id },
            updateValues: (a, b) => {
                a.properties.last_updated = b.properties.last_updated;
                a.properties.name = b.properties.name;
                a.properties.num_of_free_places = b.properties.num_of_free_places;
                a.properties.num_of_taken_places = b.properties.num_of_taken_places;
                a.properties.total_num_of_places = b.properties.total_num_of_places;
                a.properties.parking_type = b.properties.parking_type;
                a.properties.payment_link = b.properties.payment_link;
                a.properties.updated_at = b.properties.updated_at;
                return a;
            },
        },
            new Validator(Parkings.name + "ModelValidator", Parkings.outputMongooseSchemaObject),
        );
        this.transformation = new ParkingsTransformation();
        this.historyModel = new MongoModel(Parkings.history.name + "Model", {
            identifierPath: "id",
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
            savingType: "readOnly",
            searchPath: (id, multiple) => (multiple)
                ? { "properties.id": { $in: id } }
                : { "properties.id": id },
        },
            new Validator(CityDistricts.name + "ModelValidator", CityDistricts.outputMongooseSchemaObject),
        );
        this.occupanciesTransformation = new ParkingsOccupanciesTransformation();
        this.occupanciesModel = new PostgresModel(Parkings.occupancies.name + "Model", {
            outputSequelizeAttributes: Parkings.occupancies.outputSequelizeAttributes,
            pgTableName: Parkings.occupancies.pgTableName,
            savingType: "insertOnly",
        },
            new Validator(Parkings.occupancies.name + "ModelValidator",
                Parkings.occupancies.outputMongooseSchemaObject),
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

    public updateAverageOccupancy = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const id = inputData.properties.id;
        const dbData = await this.model.findOneById(id);
        const timestampMonthAgo = moment().subtract(1, "months").unix();

        const aggregation = [
            { $match: { $and: [{ id }, { updated_at: { $gte: timestampMonthAgo } }] } },
            {
                $group: {
                    _id: {
                        dayOfWeek: {
                            $subtract: [{ $dayOfWeek: { $toDate: "$updated_at" } }, 1],
                        },
                        hour: {
                            $dateToString: {
                                date: {
                                    $toDate: "$updated_at",
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
                true, this.constructor.name, 5001, err);
        }
    }

    public saveOccupanciesToDB = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const transformedData = await this.occupanciesTransformation.transform(inputData);
        await this.occupanciesModel.save(transformedData);
    }

}
