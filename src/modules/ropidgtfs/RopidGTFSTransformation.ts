"use strict";

import { RopidGTFS } from "data-platform-schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

const csvtojson = require("csvtojson");

export class RopidGTFSTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = RopidGTFS.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const parsed = await csvtojson({
            noheader: false,
        }).fromString(Buffer.from(element.data, "hex").toString("utf8"));

        // chunk into smaller sub arrays
        const total = parsed.length;
        let i = 0;
        const n = parsed.length;
        const chunks = [];
        while (i < n) {
            chunks.push(new Promise((r, j) => {
                r(parsed.slice(i, i += 1000));
            }));
        }

        return {
            data: await Promise.all(chunks),
            name: element.name,
            total,
        };
    }

}
