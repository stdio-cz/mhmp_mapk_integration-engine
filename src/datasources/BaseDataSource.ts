"use strict";

import CustomError from "../helpers/errors/CustomError";
import Validator from "../helpers/Validator";
import ISourceRequest from "./ISourceRequest";

const _ = require("underscore");

export default abstract class BaseDataSource {

    /** The name of the data source. */
    public abstract name: string;
    /** The object which specifies HTTP request. */
    protected abstract sourceRequestObject: ISourceRequest;
    /** Validation helper */
    protected abstract validator: Validator;
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
        await this.validator.Validate(data);
        return data;
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
        await this.validator.Validate(data);
        let res = {};
        res = _.find(data, (item) => {
            return this.GetSubElement(this.searchPath, item) === inId;
        });
        if (!res) { // If the object with given ID was not found, throw error
            throw new CustomError("Source data was not found.", true, 1008);
        } else { // Return the found object
            return res;
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
