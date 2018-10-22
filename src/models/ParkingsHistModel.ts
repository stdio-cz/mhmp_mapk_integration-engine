"use strict";

import mongoose = require("mongoose");
import ISchema from "../schemas/ISchema";
import ParkingsHistSchema from "../schemas/ParkingsHistSchema";
import BaseModel from "./BaseModel";
import IModel from "./IModel";

const log = require("debug")("ParkingsHistModel");
const errorLog = require("debug")("error");

export default class ParkingsHistModel extends BaseModel implements IModel {

    public name: string;
    public mongooseModel: mongoose.model;
    protected schema: ISchema;

    constructor() {
        super();
        this.name = "ParkingsHist";
        this.schema = new ParkingsHistSchema();
        try {
            this.mongooseModel = mongoose.model("ParkingsHist");
        } catch (error) {
            this.mongooseModel = mongoose.model("ParkingsHist",
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
            try {
                const promises = data.map((item) => {
                    return this.SaveOrUpdateOneToDb(item);
                });
                return Promise.all(promises).then(async (res) => {
                    log("Saving or updating data to database.");
                    return res;
                });
            } catch (err) {
                return data;
            }
        // If it's a single element
        } else {
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
            if (err instanceof Error) {
                throw err;
            } else {
                throw new Error("Error while saving to database.");
            }
        }
    }

}
