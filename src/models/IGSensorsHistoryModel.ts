"use strict";

import { IGSensorsHistory as schemaObject } from "data-platform-schema-definitions";
import mongoose = require("mongoose");
import CustomError from "../helpers/errors/CustomError";
import Validator from "../helpers/Validator";
import BaseModel from "./BaseModel";
import IModel from "./IModel";

const log = require("debug")("data-platform:integration-engine");

export default class IGSensorsHistoryModel extends BaseModel implements IModel {

    public name: string;
    protected mongooseModel: mongoose.Model<any>;
    protected validator: Validator;

    constructor() {
        super();
        this.name = "IGSensorsHistory";

        try {
            this.mongooseModel = mongoose.model(this.name);
        } catch (error) {
            this.mongooseModel = mongoose.model(this.name,
                new mongoose.Schema(schemaObject, { bufferCommands: false }));
        }
        this.validator = new Validator(this.name, schemaObject);
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
                log("IGSensorsHistModel::SaveToDB(): Saving or updating data to database.");
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
