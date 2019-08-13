"use strict";

import { getSubProperty } from "../helpers";
import { CustomError } from "../helpers/errors";
import { IDataTypeStrategy, IXMLSettings } from "./";

const xml2js = require("xml2js-es6-promise");

export class XMLDataTypeStrategy implements IDataTypeStrategy {

    private dataTypeSettings: IXMLSettings;
    private filter: (item: any) => any;

    constructor(settings: IXMLSettings) {
        this.dataTypeSettings = settings;
        this.filter = undefined;
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
            parsed = getSubProperty(this.dataTypeSettings.resultsPath, parsed);
            if (this.filter) {
                parsed = parsed.filter(this.filter);
            }
            return parsed;
        } catch (err) {
            throw new CustomError("Error while parsing source data.", true, this.constructor.name, 1030, err);
        }
    }

}
