"use strict";

import { CustomError } from "@golemio/errors";
import { ICSVSettings, IDataTypeStrategy } from "./";

const csvtojson = require("csvtojson");

export class CSVDataTypeStrategy implements IDataTypeStrategy {

    private dataTypeSettings: ICSVSettings;
    private filter: (item: any) => any;

    constructor(settings: ICSVSettings) {
        this.dataTypeSettings = settings;
        this.filter = undefined;
    }

    public setDataTypeSettings = (settings: ICSVSettings): void => {
        this.dataTypeSettings = settings;
    }

    public setFilter = (filterFunction: (item: any) => any) => {
        this.filter = filterFunction;
    }

    public parseData = async (data: any): Promise<any> => {
        try {
            let resulsArray = await csvtojson(this.dataTypeSettings.csvtojsonParams)
                .fromString(data)
                .subscribe(this.dataTypeSettings.subscribe);
            if (this.filter) {
                resulsArray = resulsArray.filter(this.filter);
            }
            return resulsArray;
        } catch (err) {
            throw new CustomError("Error while parsing source data.", true, this.constructor.name, 1030, err);
        }
    }

}
