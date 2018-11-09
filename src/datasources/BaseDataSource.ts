"use strict";

import CustomError from "../helpers/errors/CustomError";
import ISchema from "../schemas/ISchema";
import ISourceRequest from "./ISourceRequest";

const _ = require("underscore");

export default abstract class BaseDataSource {

    /** The name of the data source. */
    public abstract name: string;
    /** The object which specifies HTTP request. */
    protected abstract sourceRequestObject: ISourceRequest;
    /** Schema of the incoming data.
     * Performs validation based on this schema before any processing of the data in the app.
     */
    protected abstract schema: ISchema;
    /** Specifies where to look for the unique identifier of the object to find it in the collection. */
    protected abstract searchPath: string;
    /** Specifies where is the collection of the individual results stored in the returned object. */
    protected abstract resultsPath: string;
    /** Method that connects to remote data endpoint and gets the raw data. */
    protected abstract GetRawData: () => Promise<any>;

    /**
     * Gets raw data, validates them and sends as a response.
     *
     * @returns {Promise<any>} Promise with received data.
     */
    public GetAll = async (): Promise<any> => {
        const data = await this.GetRawData();
        const isValid = await this.schema.Validate(data);
        if (isValid) { // If there was error getting the data, or the data are ok, return this
            return data;
        } else { // If the data returned correctly, but in wrong (not valid) format
            throw new CustomError("Source data are not valid.", true, 1007);
        }
    }

    /**
     * Gets raw data, validates them.
     * If they are valid, searches for specific element within and sends it as a response.
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
                return this.GetSubElement(this.searchPath, item) === inId;
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

    /**
     * Method that reduces object data by path.
     *
     * @param {string} path Specifies where to look for the unique identifier of the object to find it in the data.
     * @param {object} obj Raw data.
     * @returns {object|array} Filtered data.
     */
    protected GetSubElement = (path: string, obj: any): any => {
        if (path === "") {
            return obj;
        } else {
            return path.split(".").reduce((prev, curr) => {
                return prev ? prev[curr] : undefined;
            }, obj || self);
        }
    }

}
