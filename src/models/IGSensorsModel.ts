"use strict";

import mongoose = require("mongoose");
import IGSensorsResponseSchema from "../schemas/IGSensorsResponseSchema";
import ISchema from "../schemas/ISchema";
import GeoJsonModel from "./GeoJsonModel";
import IModel from "./IModel";

export default class IGSensorsModel extends GeoJsonModel implements IModel {

    public name: string;
    public mongooseModel: mongoose.model;
    protected schema: ISchema;

    constructor() {
        super();
        this.name = "IGSensors";
        this.schema = new IGSensorsResponseSchema("elementSchema");
        try {
            this.mongooseModel = mongoose.model("IGSensors");
        } catch (error) {
            const schema = new mongoose.Schema(this.schema.schemaObject, { bufferCommands: false });
            // create $geonear index
            schema.index({ geometry : "2dsphere" });
            this.mongooseModel = mongoose.model("IGSensors", schema);
        }
    }

    protected updateValues = (result, item) => {
        result.properties.sensors = item.properties.sensors;
        result.properties.timestamp = item.properties.timestamp;
        return result;
    }

}
