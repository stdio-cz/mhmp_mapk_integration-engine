"use strict";

import { IceGatewaySensors } from "data-platform-schema-definitions";
import mongoose = require("mongoose");
import Validator from "../helpers/Validator";
import GeoJsonModel from "./GeoJsonModel";
import IModel from "./IModel";

export default class IGSensorsModel extends GeoJsonModel implements IModel {

    public name: string;
    protected mongooseModel: mongoose.Model<any>;
    protected validator: Validator;

    constructor() {
        super();
        this.name = "IGSensors";

        try {
            this.mongooseModel = mongoose.model(this.name);
        } catch (error) {
            const schema = new mongoose.Schema(
                IceGatewaySensors.outputMongooseSchemaObject, { bufferCommands: false });
            // create $geonear index
            schema.index({ geometry : "2dsphere" });
            this.mongooseModel = mongoose.model(this.name, schema, IceGatewaySensors.mongoCollectionName);
        }
        this.validator = new Validator(this.name, IceGatewaySensors.outputMongooseSchemaObject);
    }

    protected updateValues = (result, item) => {
        result.properties.sensors = item.properties.sensors;
        result.properties.timestamp = item.properties.timestamp;
        return result;
    }

}
