"use strict";

import { ParkingZonesDataSource as schemaObject } from "data-platform-schema-definitions";
import { model, Schema } from "mongoose";
import CustomError from "../helpers/errors/CustomError";
import Validator from "../helpers/Validator";
import IDataSource from "./IDataSource";
import ISourceRequest from "./ISourceRequest";
import JSONDataSource from "./JSONDataSource";

const request = require("request-promise");
const config = require("../config/ConfigLoader");

export default class ParkingZonesDataSource extends JSONDataSource implements IDataSource {

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
        this.name = "ParkingZonesDataSource";
        this.sourceRequestObject = {
            headers : {},
            method: "GET",
            url: config.datasources.ParkingZones,
        };
        let mongooseModel: model;
        try {
            mongooseModel = model(this.name);
        } catch (error) {
            mongooseModel = model(this.name, new Schema(schemaObject, { bufferCommands: false }));
        }
        this.validator = new Validator(this.name, mongooseModel);
        this.resultsPath = "features";
        this.searchPath = "properties.TARIFTAB";
    }

    /**
     * Method that connects to remote data endpoint and gets the raw data.
     * Overrides JSONDataSource::GetRawData()
     *
     * @returns {Promise<any>} Promise with returned data.
     */
    protected GetRawData = async (): Promise<any> => {
        try {
            const body = await request(this.sourceRequestObject);
            const filteredResult = this.GetSubElement(this.resultsPath, JSON.parse(body)).filter((item) => {
                return (item.properties.TARIFTAB !== null);
            });
            return filteredResult;
        } catch (err) {
            throw new CustomError("Retrieving of the source data failed.", true, 1002, err);
        }
    }

}
