"use strict";

import { ParkingZones } from "data-platform-schema-definitions";
import mongoose = require("mongoose");
import Validator from "../helpers/Validator";
import GeoJsonModel from "./GeoJsonModel";
import IModel from "./IModel";

export default class ParkingZonesModel extends GeoJsonModel implements IModel {

    public name: string;
    protected mongooseModel: mongoose.Model<any>;
    protected validator: Validator;

    constructor() {
        super();
        this.name = "ParkingZones";
        this.searchPath = (id, multiple = false) => {
            return (multiple)
                ? { "properties.code": { $in: id } }
                : { "properties.code": id };
        };

        try {
            this.mongooseModel = mongoose.model("ParkingZones");
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
        return result;
    }

}
