"use strict";

import { CustomError } from "../helpers/errors";
import { IDataTypeStrategy, IXMLSettings } from "./";

const xml2js = require("xml2js-es6-promise");

export class XMLDataTypeStrategy implements IDataTypeStrategy {

    private dataTypeSettings: IXMLSettings;
    private filter: (item: any) => any;

    constructor(settings: IXMLSettings) {
        this.dataTypeSettings = settings;
        this.filter = null;
    }

    public setDataTypeSettings = (settings: IXMLSettings): void => {
        this.dataTypeSettings = settings;
    }

    public setFilter = (filterFunction: (item: any) => any) => {
        this.filter = filterFunction;
    }

    public parseData = async (data: any): Promise<any> => {
        try {
            let parsed = await xml2js(data, this.dataTypeSettings.xml2jsParams);
            parsed = this.getSubElement(this.dataTypeSettings.resultsPath, parsed);
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
    protected getSubElement = (path: string, obj: any): any => {
        if (path === "") {
            return obj;
        } else {
            return path.split(".").reduce((prev, curr) => {
                return prev ? prev[curr] : undefined;
            }, obj || self);
        }
    }

}
