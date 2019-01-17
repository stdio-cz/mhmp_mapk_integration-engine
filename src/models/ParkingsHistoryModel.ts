"use strict";

import { Parkings } from "data-platform-schema-definitions";
import mongoose = require("mongoose");
import CustomError from "../helpers/errors/CustomError";
import log from "../helpers/Logger";
import Validator from "../helpers/Validator";
import IModel from "./IModel";
import MongoModel from "./MongoModel";

export default class ParkingsHistoryModel extends MongoModel implements IModel {

    public name: string;
    protected mongooseModel: mongoose.Model<any>;
    protected validator: Validator;

    constructor() {
        super();
        this.name = Parkings.history.name;

        try {
            this.mongooseModel = mongoose.model(this.name);
        } catch (error) {
            this.mongooseModel = mongoose.model(this.name,
                new mongoose.Schema(Parkings.history.outputMongooseSchemaObject, { bufferCommands: false }),
                Parkings.history.mongoCollectionName);
        }
        this.validator = new Validator(this.name, Parkings.history.outputMongooseSchemaObject);
    }

    public GetAverageTakenPlacesById = async (id: number): Promise<any> => {
        try {
            const aggregation = [
                { $match: { id } },
                {
                    $group: {
                        _id: {
                            dayOfWeek: {
                                $dayOfWeek: {
                                    $toDate: "$timestamp",
                                },
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
            const res = await this.mongooseModel.aggregate(aggregation).exec();
            const transformedResult = {};
            const promises = res.map((r) => {
                if (!transformedResult[r._id.dayOfWeek]) {
                    transformedResult[r._id.dayOfWeek] = {};
                }
                transformedResult[r._id.dayOfWeek][r._id.hour] = r.avg_taken;

            });
            await Promise.all(promises);
            return transformedResult;
        } catch (err) {
            throw new CustomError("Error while getting average taken places.", true, this.name, 1020, err);
        }
    }

    /**
     * Validates and Saves transformed element or collection to database.
     *
     * @param data Whole FeatureCollection to be saved into DB, or single item to be saved
     */
    public SaveToDb = async (data) => {
        // data validation
        await this.validator.Validate(data);

        // If the data to be saved is the whole collection (contains geoJSON features)
        if (data instanceof Array) {
            const promises = data.map((item) => {
                return this.SaveOrUpdateOneToDb(item);
            });
            return Promise.all(promises).then(async (res) => {
                log.debug("ParkingsHistModel::SaveToDB(): Saving or updating data to database.");
                return res;
            });
        } else { // If it's a single element
            return await this.SaveOrUpdateOneToDb(data);
        }
    }

    /**
     * Saves or updates element to database.
     *
     * @param item
     */
    protected SaveOrUpdateOneToDb = async (item) => {
        try {
            let result = await this.mongooseModel.create(item);
            result = result.toObject();
            delete result._id;
            delete result.__v;
            // Returns the item saved to the database (stripped of _id and __v)
            return result;
        } catch (err) {
            throw new CustomError("Error while saving to database.", true, this.name, 1003, err);
        }
    }

}
