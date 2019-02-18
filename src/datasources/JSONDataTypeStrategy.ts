"use strict";

import CustomError from "../helpers/errors/CustomError";
import { IDataTypeStrategy, IJSONSettings } from "./IDataTypeStrategy";

export default class JSONDataTypeStrategy implements IDataTypeStrategy {

    private resultsPath: string;
    private filter: (item: any) => any;

    constructor(settings: IJSONSettings) {
        this.resultsPath = settings.resultsPath;
        this.filter = null;
    }

    public setDataTypeSettings = (settings: IJSONSettings): void => {
        this.resultsPath = settings.resultsPath;
    }

    public setFilter = (filterFunction: (item: any) => any) => {
        this.filter = filterFunction;
    }

    public parseData = async (data: any): Promise<any> => {
        try {
            if (typeof data === "string") {
                data = JSON.parse(data);
            }
            let parsed = this.GetSubElement(this.resultsPath, data);
            if (this.filter) {
                parsed = parsed.filter(this.filter);
            }
            return parsed;
        } catch (err) {
            throw new CustomError("Retrieving of the source data failed.", true, this.constructor.name, 1002, err);
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
