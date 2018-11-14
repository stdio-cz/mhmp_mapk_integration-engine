"use strict";

import IGSensorsDataSourceSchema from "../schemas/IGSensorsDataSourceSchema";
import IDataSource from "./IDataSource";
import ISourceRequest from "./ISourceRequest";
import JSONDataSource from "./JSONDataSource";

const config = require("../helpers/ConfigLoader");

export default class IGSensorsDataSource extends JSONDataSource implements IDataSource {

    /** The name of the data source. */
    public name: string;
    /** The object which specifies HTTP request. */
    protected sourceRequestObject: ISourceRequest;
    /** Schema of the incoming data.
     * Performs validation based on this schema before any processing of the data in the app.
     */
    protected schema: IGSensorsDataSourceSchema;
    /** Specifies where to look for the unique identifier of the object to find it in the collection. */
    protected searchPath: string;
    /** Specifies where is the collection of the individual results stored in the returned object. */
    protected resultsPath: string;

    constructor() {
        super();
        this.name = "IGSensors";
        this.sourceRequestObject = {
            headers : {
                Authorization: "Token " + config.datasources.IGToken,
            },
            method: "GET",
            url: config.datasources.IGSensors,
        };
        this.schema = new IGSensorsDataSourceSchema();
        this.resultsPath = "";
        this.searchPath = "ice_id";
    }

}
