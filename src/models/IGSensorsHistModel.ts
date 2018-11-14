"use strict";

import mongoose = require("mongoose");
import CustomError from "../helpers/errors/CustomError";
import IGSensorsHistSchema from "../schemas/IGSensorsHistSchema";
import ISchema from "../schemas/ISchema";
import BaseModel from "./BaseModel";
import IModel from "./IModel";

const log = require("debug")("data-platform:integration-engine");

export default class IGSensorsHistModel extends BaseModel implements IModel {

    public name: string;
    public mongooseModel: mongoose.model;
    protected schema: ISchema;

    constructor() {
        super();
        this.name = "IGSensorsHist";
        this.schema = new IGSensorsHistSchema();
        try {
            this.mongooseModel = mongoose.model("IGSensorsHist");
        } catch (error) {
            this.mongooseModel = mongoose.model("IGSensorsHist",
                new mongoose.Schema(this.schema.schemaObject, { bufferCommands: false }));
        }
    }

    /**
     * Saves transformed element or collection to database and updates refresh timestamp.
     *
     * @param data Whole FeatureCollection to be saved into DB, or single item to be saved
     */
    public SaveToDb = async (data) => {
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
            throw new CustomError("Error while saving to database.", true, 1003, err);
        }
    }

}
