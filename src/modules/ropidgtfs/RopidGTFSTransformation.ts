"use strict";

import { RopidGTFS } from "@golemio/schema-definitions";
import { parse as fastcsvParse } from "fast-csv";
import { Readable } from "stream";
import { log } from "../../core/helpers";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class RopidGTFSTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = RopidGTFS.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        let hrstart = process.hrtime();

        const buffer = Buffer.from(element.data, "hex");
        const readable = new Readable();
        readable._read = () => {
            // _read is required but you can noop it
        };
        readable.push(buffer);
        readable.push(null);
        log.debug(`${element.name}: buffer to stream: ${process.hrtime(hrstart)[0]}s `
            + `${process.hrtime(hrstart)[1] / 1000000}ms`);

        return new Promise((resolve, reject) => {
            hrstart = process.hrtime();
            let parsed = [];
            const chunks = [];
            readable
                .pipe(fastcsvParse({ headers: true }))
                .on("error", (error) => {
                    reject(error);
                })
                .on("data", (row) => {
                    parsed.push(row);
                    if (parsed.length % 1000 === 0) {
                        chunks.push(parsed);
                        parsed = [];
                    }
                })
                .on("end", (rowCount) => {
                    if (parsed.length > 0) {
                        chunks.push(parsed);
                        parsed = [];
                    }
                    log.debug(`${element.name}: parsed ${rowCount} rows (${chunks.length} chunks)`);
                    log.debug(`${element.name}: csv to json: ${process.hrtime(hrstart)[0]}s `
                        + `${process.hrtime(hrstart)[1] / 1000000}ms`);
                    return resolve({
                        data: chunks,
                        name: element.name,
                        total: rowCount,
                    });
                });
        });
    }
}
