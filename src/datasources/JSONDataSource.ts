"use strict";

import CustomError from "../helpers/errors/CustomError";
import BaseDataSource from "./BaseDataSource";

const request = require("request-promise");

export default abstract class JSONDataSource extends BaseDataSource {

    /**
     * Method that connects to remote data endpoint and gets the raw data.
     *
     * @returns {Promise<any>} Promise with returned data.
     */
    protected GetRawData = async (): Promise<any> => {
        try {
            const body = await request(this.sourceRequestObject);
            return this.GetSubElement(this.resultsPath, JSON.parse(body));
        } catch (err) {
            throw new CustomError("Retrieving of the source data failed.", true, this.name, 1002, err);
        }
    }

}
