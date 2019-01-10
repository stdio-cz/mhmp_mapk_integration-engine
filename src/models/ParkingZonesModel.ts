"use strict";

import { ParkingZones } from "data-platform-schema-definitions";
import mongoose = require("mongoose");
import CustomError from "../helpers/errors/CustomError";
import Validator from "../helpers/Validator";
import GeoJsonModel from "./GeoJsonModel";
import IModel from "./IModel";

export default class ParkingZonesModel extends GeoJsonModel implements IModel {

    public name: string;
    protected mongooseModel: mongoose.Model<any>;
    protected validator: Validator;

    constructor() {
        super();
        this.name = ParkingZones.name;
        this.searchPath = (id, multiple = false) => {
            return (multiple)
                ? { "properties.code": { $in: id } }
                : { "properties.code": id };
        };

        try {
            this.mongooseModel = mongoose.model(this.name);
        } catch (error) {
            const schema = new mongoose.Schema(ParkingZones.outputMongooseSchemaObject, { bufferCommands: false });
            // create $geonear index
            schema.index({ geometry : "2dsphere" });
            this.mongooseModel = mongoose.model(this.name, schema, ParkingZones.mongoCollectionName);
        }
        this.validator = new Validator(this.name, ParkingZones.outputMongooseSchemaObject);
    }

    protected updateValues = (result, item) => {
        result.properties.name = item.properties.name;
        result.properties.number_of_places = item.properties.number_of_places;
        result.properties.payment_link = item.properties.payment_link;
        result.properties.tariffs = item.properties.tariffs;
        result.properties.timestamp = item.properties.timestamp;
        result.properties.type = item.properties.type;
        result.properties.midpoint = item.properties.midpoint;
        result.properties.northeast = item.properties.northeast;
        result.properties.southwest = item.properties.southwest;
        result.properties.zps_id = item.properties.zps_id;
        result.properties.zps_ids = item.properties.zps_ids;
        return result;
    }

    /**
     * Overrides GeoJsonModel::SaveOrUpdateOneToDb
     *
     * @param item
     */
    protected SaveOrUpdateOneToDb = async (item) => {
        try {
            // Search for the item in db
            let result = await this.mongooseModel.findOne(this.searchPath(item.properties.code));

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
            throw new CustomError("Error while saving to database.", true, this.name, 1003, err);
        }
    }

}
