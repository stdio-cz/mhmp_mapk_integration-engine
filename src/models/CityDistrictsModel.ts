"use strict";

import mongoose = require("mongoose");
import CustomError from "../helpers/errors/CustomError";
import CityDistrictsResponseSchema from "../schemas/CityDistrictsResponseSchema";
import ISchema from "../schemas/ISchema";
import BaseModel from "./BaseModel";
import IModel from "./IModel";

const log = require("debug")("data-platform:integration-engine");

export default class CityDistrictsModel extends BaseModel implements IModel {

    public name: string;
    public mongooseModel: mongoose.model;
    protected schema: ISchema;

    constructor() {
        super();
        this.name = "CityDistricts";
        this.schema = new CityDistrictsResponseSchema("elementSchema");

        try {
            this.mongooseModel = mongoose.model("CityDistricts");
        } catch (error) {
            this.mongooseModel = mongoose.model("CityDistricts",
                new mongoose.Schema(this.schema.schemaObject, { bufferCommands: false }));
        }
        this.searchPath = (id, multiple = false) => {
            return (multiple)
                ? (!isNaN(Number(id))) ? { id: { $in: id } } : { slug: { $in: id } }
                : (!isNaN(Number(id))) ? { id } : { slug: id };
        };
        this.select = "-_id -__v -loc";
    }

    /**
     * Returns district's slug by coordinates
     *
     * @param coordinates
     */
    public GetDistrictByCoordinations = async (coordinates) => {
        try {
            const query = {
                loc: {
                    $geoIntersects: {
                        $geometry: {
                            coordinates,
                            type: "Point",
                        },
                    },
                },
            };
            const res = await this.mongooseModel.findOne(query).exec();
            return (res) ? res.slug : null;
        } catch (err) {
            throw new CustomError("Error while getting district by coordinations.", true, 1013, err);
        }
    }

    /**
     * Saves transformed element or collection to database and updates refresh timestamp.
     *
     * @param data
     */
    public SaveToDb = async (data: any): Promise<any> => {
        // If the data to be saved is the whole collection (contains geoJSON features)
        if (data instanceof Array) {
            const promises = data.map((item) => {
                return this.SaveOrUpdateOneToDb(item);
            });
            return Promise.all(promises).then(async (res) => {
                log("CityDistrictsModel::SaveToDB(): Saving or updating data to database.");
                await this.refreshTimesModel.UpdateLastRefresh(this.name + "-all");
                return res;
            });
        } else { // If it's a single element
            return await this.SaveOrUpdateOneToDb(data);
        }
    }

    /**
     * Updates values of the object which is already in DB
     *
     * @param result Object to update.
     * @param item New object.
     */
    protected updateValues = (result, item) => {
        result.slug = item.slug;
        result.name = item.name;
        result.loc = item.loc;
        return result;
    }

    /**
     * Saves or updates element to database.
     *
     * @param item
     */
    protected SaveOrUpdateOneToDb = async (item) => {
        try {
            // Search for the item in db
            let result = await this.mongooseModel.findOne({ id: item.id });

            if (!result) { // If item doesn't exist in the db yet
                // Create it
                result = await this.mongooseModel.create(item);
            } else { // If the item already is in the db
                // Update its properties to new values according to the new input
                result = this.updateValues(result, item);
                // Save the change
                result = await result.save();
            }
            await this.refreshTimesModel.UpdateLastRefresh(this.name + "-" + item.id);
            result = result.toObject();
            delete result._id;
            delete result.__v;
            delete result.loc;
            // Returns the item saved to the database (stripped of _id and __v)
            return result;
        } catch (err) {
            throw new CustomError("Error while saving to database.", true, 1003, err);
        }
    }

}
