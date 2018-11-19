"use strict";

import { CityDistrictsDataSource as schemaObject } from "data-platform-schema-definitions";
import { model, Schema } from "mongoose";
import CustomError from "../helpers/errors/CustomError";
import Validator from "../helpers/Validator";
import IDataSource from "./IDataSource";
import ISourceRequest from "./ISourceRequest";
import JSONDataSource from "./JSONDataSource";

const _ = require("underscore");
const slug = require("slugify");
const config = require("../config/ConfigLoader");

export default class CityDistrictsDataSource extends JSONDataSource implements IDataSource {

    /** The name of the data source. */
    public name: string;
    /** The object which specifies HTTP request. */
    protected sourceRequestObject: ISourceRequest;
    /** Validation helper */
    protected validator: Validator;
    /** Specifies where to look for the unique identifier of the object to find it in the collection. */
    protected searchPath: string;
    /** Specifies where is the collection of the individual results stored in the returned object. */
    protected resultsPath: string;

    constructor() {
        super();
        this.name = "CityDistrictsDataSource";
        this.sourceRequestObject = {
            headers : {},
            method: "GET",
            url: config.datasources.CityDistricts,
        };
        let mongooseModel: model;
        try {
            mongooseModel = model(this.name);
        } catch (error) {
            mongooseModel = model(this.name, new Schema(schemaObject, { bufferCommands: false }));
        }
        this.validator = new Validator(this.name, mongooseModel);
        this.resultsPath = "features";
        this.searchPath = "item.properties.KOD_MC";
    }

    /**
     * Gets raw data, validates them.
     * If they are valid, searches for specific element within and sends it as a response.
     * Overrides BaseDataSource::GetOne()
     *
     * @param {any} inId Identifier of the specific element.
     * @returns {Promise<any>} Promise with received data.
     */
    public GetOne = async (inId: any): Promise<any> => {
        const data = await this.GetRawData();
        await this.validator.Validate(data);
        let res = {};
        res = _.find(data, (item) => {
            return item.properties.KOD_MC === inId
                || slug(item.properties.NAZEV_MC, { lower: true }) === inId;
        });
        if (!res) { // If the object with given ID was not found, throw error
            throw new CustomError("Source data was not found.", true, 1008);
        } else { // Return the found object
            return res;
        }
    }

}
