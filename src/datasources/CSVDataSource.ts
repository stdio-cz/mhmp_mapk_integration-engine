"use strict";

import CustomError from "../helpers/errors/CustomError";
import BaseDataSource from "./BaseDataSource";

const request = require("request-promise");
const csvtojson = require("csvtojson");

export default abstract class CSVDataSource extends BaseDataSource {

    /** csvtojson line transformation */
    protected abstract subscribe: (json: any) => any;

    /**
     * Method that connects to remote data endpoint and gets the raw data.
     *
     * @returns {Promise<any>} Promise with returned data.
     */
    protected GetRawData = async (): Promise<any> => {
        try {
            const body = await request(this.sourceRequestObject);
            const resulsArray = await csvtojson({ noheader: false })
                .fromString(body)
                .subscribe(this.subscribe);
            return resulsArray;
        } catch (err) {
            throw new CustomError("Retrieving of the source data failed.", true, this.name, 1002, err);
        }
    }

}
