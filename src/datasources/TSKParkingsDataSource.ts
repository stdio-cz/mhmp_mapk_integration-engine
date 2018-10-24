"use strict";

import TSKParkingsDataSourceSchema from "../schemas/TSKParkingsDataSourceSchema";
import IDataSource from "./IDataSource";
import ISourceRequest from "./ISourceRequest";
import JSONDataSource from "./JSONDataSource";

const config = require("../../config.js");

export default class TSKParkingsDataSource extends JSONDataSource implements IDataSource {

    /** The name of the data source. */
    public name: string;
    /** The object which specifies HTTP request. */
    protected sourceRequestObject: ISourceRequest;
    /** Schema of the incoming data.
     * Performs validation based on this schema before any processing of the data in the app.
     */
    protected schema: TSKParkingsDataSourceSchema;
    /** Specifies where to look for the unique identifier of the object to find it in the collection. */
    protected searchPath: string;
    /** Specifies where is the collection of the individual results stored in the returned object. */
    protected resultsPath: string;

    constructor() {
        super();
        this.name = "TSKParkings";
        this.sourceRequestObject = {
            headers : {},
            method: "GET",
            url: config.dataSources.TSKParkings,
        };
        this.schema = new TSKParkingsDataSourceSchema();
        this.resultsPath = "results";
        this.searchPath = "id";
    }

}
