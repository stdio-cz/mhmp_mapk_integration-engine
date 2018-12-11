"use strict";

import { Parkings } from "data-platform-schema-definitions";
import mongoose = require("mongoose");
import Validator from "../helpers/Validator";
import GeoJsonModel from "./GeoJsonModel";
import IModel from "./IModel";

export default class ParkingsModel extends GeoJsonModel implements IModel {

    public name: string;
    protected mongooseModel: mongoose.Model<any>;
    protected validator: Validator;

    constructor() {
        super();
        this.name = "Parkings";

        try {
            this.mongooseModel = mongoose.model("Parkings");
        } catch (error) {
            const schema = new mongoose.Schema(Parkings.outputMongooseSchemaObject, { bufferCommands: false });
            // create $geonear index
            schema.index({ geometry : "2dsphere" });
            // create $text index
            schema.index({ "properties.name": "text", "properties.address": "text" },
                {weights: { "properties.name": 5, "properties.address": 1 }});
            this.mongooseModel = mongoose.model(this.name, schema, Parkings.mongoCollectionName);
        }
        this.validator = new Validator(this.name, Parkings.outputMongooseSchemaObject);
    }

    protected updateValues = (result, item) => {
        result.properties.name = item.properties.name;
        result.properties.num_of_free_places = item.properties.num_of_free_places;
        result.properties.num_of_taken_places = item.properties.num_of_taken_places;
        result.properties.total_num_of_places = item.properties.total_num_of_places;
        result.properties.parking_type = item.properties.parking_type;
        result.properties.timestamp = item.properties.timestamp;
        return result;
    }

}
