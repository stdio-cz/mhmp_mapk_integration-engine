"use strict";

import { CityDistricts } from "data-platform-schema-definitions";
import mongoose = require("mongoose");
import CustomError from "../helpers/errors/CustomError";
import Validator from "../helpers/Validator";
import GeoJsonModel from "./GeoJsonModel";
import IModel from "./IModel";

const debugLog = require("debug")("data-platform:integration-engine:debug");

export default class CityDistrictsModel extends GeoJsonModel implements IModel {

    public name: string;
    protected mongooseModel: mongoose.Model<any>;
    protected validator: Validator;

    constructor() {
        super();
        this.name = CityDistricts.name;
        try {
            this.mongooseModel = mongoose.model(this.name);
        } catch (error) {
            this.mongooseModel = mongoose.model(this.name,
                new mongoose.Schema(CityDistricts.outputMongooseSchemaObject, { bufferCommands: false }),
                CityDistricts.mongoCollectionName);
        }
        this.validator = new Validator(this.name, CityDistricts.outputMongooseSchemaObject);
        this.searchPath = (id, multiple = false) => {
            return (multiple)
                ? (!isNaN(Number(id))) ? { "properties.id": { $in: id } } : { "properties.slug": { $in: id } }
                : (!isNaN(Number(id))) ? { "properties.id": id } : { "properties.slug": id };
        };
        this.select = "-_id -__v";
    }

    /**
     * Returns district's slug by coordinates
     *
     * @param coordinates
     */
    public GetDistrictByCoordinations = async (coordinates) => {
        try {
            const query = {
                geometry: {
                    $geoIntersects: {
                        $geometry: {
                            coordinates,
                            type: "Point",
                        },
                    },
                },
            };
            const res = await this.mongooseModel.findOne(query).exec();
            return (res) ? res.properties.slug : null;
        } catch (err) {
            throw new CustomError("Error while getting district by coordinations.", true, this.name, 1013, err);
        }
    }

    /**
     * Updates values of the object which is already in DB
     *
     * @param result Object to update.
     * @param item New object.
     */
    protected updateValues = (result, item) => {
        result.geometry.coordinates = item.geometry.coordinates;
        result.properties.name = item.properties.name;
        result.properties.slug = item.properties.slug;
        result.properties.timestamp = item.properties.timestamp;
        return result;
    }

}
