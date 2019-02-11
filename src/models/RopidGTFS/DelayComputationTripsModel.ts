"use strict";

import { RopidGTFS } from "data-platform-schema-definitions";
import mongoose = require("mongoose");
import CustomError from "../../helpers/errors/CustomError";
import log from "../../helpers/Logger";
import Validator from "../../helpers/Validator";
import IModel from "./../IModel";
import MongoModel from "./../MongoModel";

export default class DelayComputationTripsModel extends MongoModel implements IModel {

    public name: string;
    protected mongooseModel: mongoose.Model<any>;
    protected validator: Validator;

    constructor() {
        super();
        this.name = RopidGTFS.delayComputationTrips.name;

        try {
            this.mongooseModel = mongoose.model(this.name);
        } catch (error) {
            this.mongooseModel = mongoose.model(this.name,
                new mongoose.Schema(RopidGTFS.delayComputationTrips.outputMongooseSchemaObject,
                    { bufferCommands: false }),
                RopidGTFS.delayComputationTrips.mongoCollectionName);
        }
        this.validator = new Validator(this.name, RopidGTFS.delayComputationTrips.outputMongooseSchemaObject);
        this.searchPath = (id, multiple = false) => {
            return (multiple)
                ? { "trip.trip_id": { $in: id } }
                : { "trip.trip_id": id };
        };
        this.select = "-_id -__v";
    }

    /**
     * Validates and Saves transformed element or collection to database.
     *
     * @param data Whole FeatureCollection to be saved into DB, or single item to be saved
     */
    public SaveToDb = async (data) => {
        // data validation
        // await this.validator.Validate(data);

        // If the data to be saved is the whole collection (contains geoJSON features)
        if (data instanceof Array) {
            const res = await this.mongooseModel.insertMany(data);
            log.debug(this.name + "::SaveToDB(): Saving or updating data to database.");
            return res;
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
