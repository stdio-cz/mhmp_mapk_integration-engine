"use strict";

import { TSKParkingsDataSource as schemaObject } from "data-platform-schema-definitions";
import { model, Schema } from "mongoose";
import Validator from "../helpers/Validator";
import IDataSource from "./IDataSource";
import ISourceRequest from "./ISourceRequest";
import JSONDataSource from "./JSONDataSource";

const config = require("../config/ConfigLoader");

export default class TSKParkingsDataSource extends JSONDataSource implements IDataSource {

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
        this.name = "TSKParkingsDataSource";
        this.sourceRequestObject = {
            headers : {},
            method: "GET",
            url: config.datasources.TSKParkings,
        };
        let mongooseModel: model;
        try {
            mongooseModel = model(this.name);
        } catch (error) {
            mongooseModel = model(this.name, new Schema(schemaObject, { bufferCommands: false }));
        }
        this.validator = new Validator(this.name, mongooseModel);
        this.resultsPath = "results";
        this.searchPath = "id";
    }

}
