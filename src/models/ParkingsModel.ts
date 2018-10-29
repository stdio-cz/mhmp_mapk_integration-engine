"use strict";

import mongoose = require("mongoose");
import ISchema from "../schemas/ISchema";
import ParkingsResponseSchema from "../schemas/ParkingsResponseSchema";
import GeoJsonModel from "./GeoJsonModel";
import IModel from "./IModel";

export default class ParkingsModel extends GeoJsonModel implements IModel {

    public name: string;
    public mongooseModel: mongoose.model;
    protected schema: ISchema;

    constructor() {
        super();
        this.name = "Parkings";
        this.schema = new ParkingsResponseSchema("elementSchema");
        try {
            this.mongooseModel = mongoose.model("Parkings");
        } catch (error) {
            const schema = new mongoose.Schema(this.schema.schemaObject, { bufferCommands: false });
            // create $geonear index
            schema.index({ geometry : "2dsphere" });
            // create $text index
            schema.index({ "properties.name": "text", "properties.address": "text" },
                {weights: { "properties.name": 5, "properties.address": 1 }});
            this.mongooseModel = mongoose.model("Parkings",
                schema);
        }
        // const dateFrom = new Date().getTime() - (2 * 24 * 60 * 60 * 1000);
        // this.where = {"properties.last_updated" : { $gte: dateFrom } };
    }

    protected updateValues = (result, item) => {
        result.properties.last_updated = item.properties.last_updated;
        result.properties.name = item.properties.name;
        result.properties.num_of_free_places = item.properties.num_of_free_places;
        result.properties.num_of_taken_places = item.properties.num_of_taken_places;
        result.properties.total_num_of_places = item.properties.total_num_of_places;
        result.properties.parking_type = item.properties.parking_type;
        return result;
    }

}
