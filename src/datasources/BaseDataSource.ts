"use strict";

import ISchema from "../schemas/ISchema";
import ISourceRequest from "./ISourceRequest";

const request = require("request");
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
    /** Type of the data source - json/xml/... */
    protected abstract sourceType: string;
    /** Specifies where to look for the unique identifier of the object to find it in the collection. */
    protected abstract searchPath: string;
    /** Specifies where is the collection of the individual results stored in the returned object. */
    protected abstract resultsPath: string;

    /**
     * Gets raw data, validates them and sends as a response.
     *
     * @returns {Promise<any>} Promise with received data.
     */
    public GetAll = (): Promise<any> => {
        return new Promise((resolve, reject) => {
            this.GetRawData()
                .then((data) => {
                    // return [ data, isValid ]
                    return Promise.all([data, this.schema.Validate(data)]);
                }).then((promises) => {
                    // If there was error getting the data, or the data are ok, return this
                    if (promises[1]) {
                        resolve(promises[0]);
                    } else { // If the data returned correctly, but in wrong (not valid) format
                        reject({ error: "Source data is not valid." });
                    }
                }).catch((err) => {
                    reject(err);
                });
        });
    }

    /**
     * Gets raw data, validates them.
     * If they are valid, searches for specific element within and sends it as a response.
     *
     * @param {any} inId Identifier of the specific element.
     * @returns {Promise<{}>} Promise with received data.
     */
    public GetOne = (inId: any): Promise<{}> => {
        return new Promise((resolve, reject) => {
            this.GetRawData()
                .then((data) => {
                    // return [ data, isValid ]
                    return Promise.all([data, this.schema.Validate(data)]);
                }).then((promises) => {
                    if (promises[1]) {
                        // returns valid source data
                        let res = {};
                        res = _.find(promises[0], (item) => {
                            return this.GetSubElement(this.searchPath, item) === inId;
                        });
                        // If the object with given ID was not found, return 404 error
                        if (!res) {
                            reject({ error: "Not Found", error_code: 404 });
                        } else { // Return the found object
                            resolve(res);
                        }
                    } else { // Data is not valid, return error
                        reject({ error: "Source data is not valid." });
                    }
                }).catch((err) => {
                    reject(err);
                });
        });
    }

    /**
     * Method that reduces object data by path.
     *
     * @param {string} path Specifies where to look for the unique identifier of the object to find it in the data.
     * @param {object} obj Raw data.
     * @returns {object|array} Filtered data.
     */
    protected GetSubElement = (path, obj): any => {
        if (path === "") {
            return obj;
        } else {
            return path.split(".").reduce((prev, curr) => {
                return prev ? prev[curr] : undefined;
            }, obj || self);
        }
    }

    /**
     * Method that connects to remote data endpoint and gets the raw data.
     *
     * TODO: Create different types of DataSources (XMLDataSource, JSONDataSource)
     * and implement their own GetRawData in each of them
     *
     * @returns {Promise<{}>} Promise with returned data.
     */
    protected GetRawData = (): Promise<{}> => {
        return new Promise((resolve, reject) => {
            request(this.sourceRequestObject, (err, response, body) => {
                if (!err && response && response.statusCode === 200) {
                    if (this.sourceType === "json") {
                        resolve(this.GetSubElement(this.resultsPath, JSON.parse(body)));
                    } else if (this.sourceType === "xml") {
                        const parseString = require("xml2js").parseString;
                        parseString(body, (parseErr, result) => {
                            if (parseErr) {
                                reject({
                                    error: "Retrieving of the source data failed.",
                                    error_description: parseErr,
                                });
                            }
                            resolve(this.GetSubElement(this.resultsPath, result));
                        });
                    }
                } else {
                    reject({
                        error: "Retrieving of the source data failed.",
                        error_description: err,
                    });
                }
            });
        });
    }

}
