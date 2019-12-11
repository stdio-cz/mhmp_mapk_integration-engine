"use strict";

import { RopidGTFS } from "@golemio/schema-definitions";
import * as csv from "csv-parser";
import { Readable } from "stream";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class RopidGTFSTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = RopidGTFS.name;
    }

    protected transformElement = async (element: any): Promise<{data: Readable, name: string}> => {
        const buffer = Buffer.from(element.data, "hex");
        const readable = new Readable();
        readable._read = () => {
            // _read is required but you can noop it
        };
        readable.push(buffer);
        readable.push(null);

        return {
            data: readable.pipe(csv()),
            name: element.name,
        };
    }
}
