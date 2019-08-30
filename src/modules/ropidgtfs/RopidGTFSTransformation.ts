"use strict";

import { RopidGTFS } from "@golemio/schema-definitions";
import { log } from "../../core/helpers";
import { BaseTransformation, ITransformation } from "../../core/transformations";

const lodash = require("lodash");
const fastcsv = require("fast-csv");

export class RopidGTFSTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = RopidGTFS.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        let hrstart = process.hrtime();
        const str = Buffer.from(element.data, "hex").toString("utf8");
        log.debug(`${element.name}: buffer to string: ${process.hrtime(hrstart)[0]}s `
            + `${process.hrtime(hrstart)[1] / 1000000}ms"`);

        return new Promise((resolve, reject) => {
            hrstart = process.hrtime();
            const parsed = [];
            fastcsv
                .parseString(str, { headers: true })
                .on("error", (error) => {
                    reject(error);
                })
                .on("data", (row) => {
                    parsed.push(row);
                })
                .on("end", (rowCount) => {
                    log.debug(`${element.name}: parsed ${rowCount} rows`);
                    log.debug(`${element.name}: csv to json: ${process.hrtime(hrstart)[0]}s `
                        + `${process.hrtime(hrstart)[1] / 1000000}ms"`);

                    hrstart = process.hrtime();
                    const total = parsed.length;
                    // chunk into smaller sub arrays
                    const chunks = lodash.chunk(parsed, 1000);
                    log.debug(`${element.name}: array to chunks: ${process.hrtime(hrstart)[0]}s `
                        + `${process.hrtime(hrstart)[1] / 1000000}ms"`);

                    return resolve({
                        data: chunks,
                        name: element.name,
                        total,
                    });
                });
        });

    }

}
