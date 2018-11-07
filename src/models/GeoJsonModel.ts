"use strict";

import mongoose = require("mongoose");
import CustomError from "../helpers/errors/CustomError";
import ISchema from "../schemas/ISchema";
import BaseModel from "./BaseModel";

const log = require("debug")("data-platform:integration-engine");

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
    public SaveToDb = async (data: any): Promise<any> => {
        // If the data to be saved is the whole collection (contains geoJSON features)
        if (data.features && data.features instanceof Array) {
            const promises = data.features.map((item) => {
                return this.SaveOrUpdateOneToDb(item);
            });
            return Promise.all(promises).then(async (res) => {
                log("GeoJsonModel::SaveToDB(): Saving or updating data to database.");
                return this.createOutputCollection(res);
            });
        } else { // If it's a single element
            return await this.SaveOrUpdateOneToDb(data);
        }
    }

    /**
     * Data validation
     * Overrides BaseModel::Validate()
     *
     * @param {any} data
     * @returns {boolean}
     */
    public Validate = async (data: any): Promise<boolean> => {
        data = data.features;
        if (data instanceof Array) {
            if (data.length === 0) {
                return true;
            } else {
                const promises = data.map((element) => {
                    return this.ValidateElement(element);
                });
                const elemResults = await Promise.all(promises);
                return (elemResults.indexOf(false) !== -1) ? false : true;
            }
        } else {
            return await this.ValidateElement(data);
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
