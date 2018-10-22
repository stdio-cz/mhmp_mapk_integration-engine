"use strict";

import TSKParkingsDataSourceSchema from "../schemas/TSKParkingsDataSourceSchema";
import BaseDataSource from "./BaseDataSource";
import IDataSource from "./IDataSource";
import ISourceRequest from "./ISourceRequest";

const config = require("../../config.js");

export default class TSKParkingsDataSource extends BaseDataSource implements IDataSource {

    public name: string;
    protected sourceRequestObject: ISourceRequest;
    protected schema: TSKParkingsDataSourceSchema;
    protected sourceType: string;
    protected searchPath: string;
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
        this.sourceType = "json";
        this.resultsPath = "results";
        this.searchPath = "id";
    }

}
