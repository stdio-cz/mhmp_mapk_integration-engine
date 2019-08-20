"use strict";

import { CustomError } from "@golemio/errors";
import { getSubProperty } from "@golemio/utils";
import { IDataTypeStrategy, IJSONSettings } from "./";

export class JSONDataTypeStrategy implements IDataTypeStrategy {

    private resultsPath: string;
    private filter: (item: any) => any;

    constructor(settings: IJSONSettings) {
        this.resultsPath = settings.resultsPath;
        this.filter = undefined;
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
            let parsed = getSubProperty<any>(this.resultsPath, data);
            if (this.filter) {
                parsed = parsed.filter(this.filter);
            }
            return parsed;
        } catch (err) {
            throw new CustomError("Error while parsing source data.", true, this.constructor.name, 2003, err);
        }
    }

}
