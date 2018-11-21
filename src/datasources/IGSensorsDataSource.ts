"use strict";

import { IGSensorsDataSource as schemaObject } from "data-platform-schema-definitions";
import Validator from "../helpers/Validator";
import IDataSource from "./IDataSource";
import ISourceRequest from "./ISourceRequest";
import JSONDataSource from "./JSONDataSource";

const config = require("../config/ConfigLoader");

export default class IGSensorsDataSource extends JSONDataSource implements IDataSource {

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
        this.name = "IGSensorsDataSource";
        this.sourceRequestObject = {
            headers : {
                Authorization: "Token " + config.datasources.IGToken,
            },
            method: "GET",
            url: config.datasources.IGSensors,
        };
        this.validator = new Validator(this.name, schemaObject);
        this.resultsPath = "";
        this.searchPath = "ice_id";
    }

}
