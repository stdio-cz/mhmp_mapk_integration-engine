"use strict";

import mongoose = require("mongoose");
import JsonUtils from "../helpers/JsonUtils";
import ISchema from "../schemas/ISchema";
import BaseModel from "./BaseModel";

const log = require("debug")("GeoJsonModel");
const errorLog = require("debug")("error");

export default abstract class GeoJsonModel extends BaseModel {

    /** The Mongoose Model */
    public abstract mongooseModel: mongoose.model;
    /** The schema which contains schemaObject for creating the Mongoose Schema */
    protected abstract schema: ISchema;
    /** Updates values of the object which is already in DB */
    protected abstract updateValues;

    constructor() {
        super();
        this.searchPath = (id, multiple = false) => {
            return (multiple)
                ? { "properties.id": { $in: id } }
                : { "properties.id": id };
        };
        this.select = "-_id -__v";
        this.createOutputCollection = this.createOutputFeatureCollection;
    }

    /**
     * Saves transformed element or collection to database and updates refresh timestamp.
     *
     * @param data Whole FeatureCollection to be saved into DB, or single item to be saved
     */
    public SaveToDb = async (data) => {
        // If the data to be saved is the whole collection (contains geoJSON features)
        if (data.features && data.features instanceof Array) {
            try {
                const promises = data.features.map((item) => {
                    return this.SaveOrUpdateOneToDb(item);
                });
                return Promise.all(promises).then(async (res) => {
                    log("Saving or updating data to database.");
                    await this.refreshTimesModel.UpdateLastRefresh(this.name + "-all");
                    return this.createOutputCollection(res);
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
     * Creates output geoJSON FeatureCollection from array of single geoJSON features in array
     * format (eg. from database)
     *
     * @param data Array of single geoJSON features
     */
    protected createOutputFeatureCollection = (data) => {
        return {
            features: data,
            type: "FeatureCollection",
        };
    }

    /**
     * Saves or updates element to database.
     *
     * @param item
     */
    protected SaveOrUpdateOneToDb = async (item) => {
        try {
            // Search for the item in db
            let result = await this.mongooseModel.findOne(this.searchPath(item.properties.id));

            if (!result) { // If item doesn't exist in the db yet
                // Create it
                result = await this.mongooseModel.create(item);
            } else { // If the item already is in the db
                // Update its properties to new values according to the new input
                result = this.updateValues(result, item);
                // Save the change
                result = await result.save();
            }
            await this.refreshTimesModel.UpdateLastRefresh(this.name + "-" + item.properties.id);
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
