"use strict";

import BaseDataSource from "./BaseDataSource";

const request = require("request");

export default abstract class JSONDataSource extends BaseDataSource {

    /**
     * Method that connects to remote data endpoint and gets the raw data.
     *
     * @returns {Promise<any>} Promise with returned data.
     */
    protected GetRawData = async (): Promise<any> => {
        return new Promise((resolve, reject) => {
            request(this.sourceRequestObject, (err, response, body) => {
                if (!err && response && response.statusCode === 200) {
                    resolve(this.GetSubElement(this.resultsPath, JSON.parse(body)));
                } else {
                    // TODO vytvorit vlastni chybovou tridu
                    reject({
                        error: "Retrieving of the source data failed.",
                        error_description: err,
                    });
                }
            });
        });
    }

}
