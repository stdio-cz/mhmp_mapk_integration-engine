"use strict";

import CustomError from "../helpers/errors/CustomError";
import CityDistrictsDataSourceSchema from "../schemas/CityDistrictsDataSourceSchema";
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
    /** Schema of the incoming data.
     * Performs validation based on this schema before any processing of the data in the app.
     */
    protected schema: CityDistrictsDataSourceSchema;
    /** Specifies where to look for the unique identifier of the object to find it in the collection. */
    protected searchPath: string;
    /** Specifies where is the collection of the individual results stored in the returned object. */
    protected resultsPath: string;

    constructor() {
        super();
        this.name = "CityDistricts";
        this.sourceRequestObject = {
            headers : {},
            method: "GET",
            url: config.datasources.CityDistricts,
        };
        this.schema = new CityDistrictsDataSourceSchema();
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
        const isValid = await this.schema.Validate(data);
        if (isValid) { // If there was error getting the data, or the data are ok, return this
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
        } else { // If the data returned correctly, but in wrong (not valid) format
            throw new CustomError("Source data are not valid.", true, 1007);
        }
    }

}
