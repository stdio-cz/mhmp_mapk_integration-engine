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
    protected tmpMongooseModel: mongoose.Model<any>;
    protected validator: Validator;

    constructor() {
        super();
        this.name = RopidGTFS.delayComputationTrips.name;

        const schema = new mongoose.Schema(RopidGTFS.delayComputationTrips.outputMongooseSchemaObject,
            { bufferCommands: false });
        // creating index on "trip.trip_id"
        schema.index({ "trip.trip_id": 1 });

        try {
            this.mongooseModel = mongoose.model(this.name);
        } catch (error) {
            this.mongooseModel = mongoose.model(this.name, schema,
                RopidGTFS.delayComputationTrips.mongoCollectionName);
        }
        try {
            this.tmpMongooseModel = mongoose.model("tmp" + this.name);
        } catch (error) {
            this.tmpMongooseModel = mongoose.model("tmp" + this.name, schema,
                "tmp_" + RopidGTFS.delayComputationTrips.mongoCollectionName);
        }
        this.validator = new Validator(this.name, RopidGTFS.delayComputationTrips.outputMongooseSchemaObject);
        this.searchPath = (id, multiple = false) => {
            return (multiple)
                ? { "trip.trip_id": { $in: id } }
                : { "trip.trip_id": id };
        };
        this.select = "-_id -__v";
    }

    public replaceTables = async (): Promise<void> => {
        try {
            await mongoose.connection.db.collection(RopidGTFS.delayComputationTrips.mongoCollectionName)
                .rename("old_" + RopidGTFS.delayComputationTrips.mongoCollectionName);
        } catch (err) {
            log.warn("Collection " + RopidGTFS.delayComputationTrips.mongoCollectionName + "does not exist.");
        }
        try {
            await mongoose.connection.db.collection("tmp_" + RopidGTFS.delayComputationTrips.mongoCollectionName)
                .rename(RopidGTFS.delayComputationTrips.mongoCollectionName);
        } catch (err) {
            log.warn("Collection tmp_" + RopidGTFS.delayComputationTrips.mongoCollectionName + "does not exist.");
        }
        try {
            await mongoose.connection.db.collection("old_" + RopidGTFS.delayComputationTrips.mongoCollectionName)
                .drop();
        } catch (err) {
            log.warn("Collection old_" + RopidGTFS.delayComputationTrips.mongoCollectionName + "does not exist.");
        }
    }

    /**
     * Validates and Saves transformed element or collection to database.
     *
     * @param data Whole FeatureCollection to be saved into DB, or single item to be saved
     */
    public SaveToDb = async (data, tmp: boolean = false) => {
        // data validation
        // await this.validator.Validate(data);

        const model = (!tmp) ? this.mongooseModel : this.tmpMongooseModel;

        // If the data to be saved is the whole collection (contains geoJSON features)
        if (data instanceof Array) {
            const res = await model.insertMany(data);
            log.debug(this.name + "::SaveToDB(): Saving or updating data to database.");
            return res;
        } else { // If it's a single element
            return await this.SaveOrUpdateOneToDb(data);
        }
    }

    /**
     * Overrides MongoModel::Truncate
     */
    public Truncate = async (tmp: boolean = false): Promise<any> => {
        const model = (!tmp) ? this.mongooseModel : this.tmpMongooseModel;
        try {
            await model.deleteMany({}).exec();
        } catch (err) {
            throw new CustomError("Error while truncating data.", true, this.name, 1011, err);
        }
    }

    /**
     * Saves or updates element to database.
     *
     * @param item
     */
    protected SaveOrUpdateOneToDb = async (item, tmp: boolean = false) => {
        const model = (!tmp) ? this.mongooseModel : this.tmpMongooseModel;

        try {
            let result = await model.create(item);
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
