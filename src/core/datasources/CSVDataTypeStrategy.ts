"use strict";

import { CustomError } from "@golemio/errors";
import { parse as fastcsvParse } from "fast-csv";
import { Readable } from "stream";
import { ICSVSettings, IDataTypeStrategy } from "./";

export class CSVDataTypeStrategy implements IDataTypeStrategy {

    private dataTypeSettings: ICSVSettings;
    private filter: ((item: any) => any) | undefined;

    constructor(settings: ICSVSettings) {
        this.dataTypeSettings = settings;
        this.filter = undefined;
    }

    public setDataTypeSettings(settings: ICSVSettings): void {
        this.dataTypeSettings = settings;
    }

    public setFilter(filterFunction: (item: any) => any) {
        this.filter = filterFunction;
    }

    public async parseData(data: any): Promise<any> {
        const readable = new Readable();
        readable._read = () => {
            // _read is required but you can noop it
        };
        readable.push(data);
        readable.push(null);

        return new Promise((resolve, reject) => {
            let resulsArray = [];
            readable
                .pipe(fastcsvParse(this.dataTypeSettings.fastcsvParams))
                .on("error", (error) => {
                    reject(new CustomError("Error while parsing source data.", true,
                        this.constructor.name, 2003, error));
                })
                .on("data", (row) => {
                    resulsArray.push(this.dataTypeSettings.subscribe(row));
                })
                .on("end", (rowCount: number) => {
                    if (this.filter) {
                        resulsArray = resulsArray.filter(this.filter);
                    }
                    return resolve(resulsArray);
                });

        });
    }

}
