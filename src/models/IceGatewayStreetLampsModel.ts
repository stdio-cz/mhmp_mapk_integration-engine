"use strict";

import { IceGatewayStreetLamps } from "data-platform-schema-definitions";
import mongoose = require("mongoose");
import Validator from "../helpers/Validator";
import GeoJsonModel from "./GeoJsonModel";
import IModel from "./IModel";

export default class IceGatewayStreetLampsModel extends GeoJsonModel implements IModel {

    public name: string;
    protected mongooseModel: mongoose.Model<any>;
    protected validator: Validator;

    constructor() {
        super();
        this.name = IceGatewayStreetLamps.name;

        try {
            this.mongooseModel = mongoose.model(this.name);
        } catch (error) {
            const schema = new mongoose.Schema(
                IceGatewayStreetLamps.outputMongooseSchemaObject, { bufferCommands: false });
            // create $geonear index
            schema.index({ geometry : "2dsphere" });
            this.mongooseModel = mongoose.model(this.name, schema, IceGatewayStreetLamps.mongoCollectionName);
        }
        this.validator = new Validator(this.name, IceGatewayStreetLamps.outputMongooseSchemaObject);
    }

    protected updateValues = (result, item) => {
        result.properties.dim_value = item.properties.dim_value;
        result.properties.groups = item.properties.groups;
        result.properties.lamppost_id = item.properties.lamppost_id;
        result.properties.last_dim_override = item.properties.last_dim_override;
        result.properties.state = item.properties.state;
        result.properties.timestamp = item.properties.timestamp;
        return result;
    }

}