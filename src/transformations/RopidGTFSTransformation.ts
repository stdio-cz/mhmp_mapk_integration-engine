"use strict";

import { RopidGTFS } from "data-platform-schema-definitions";
import BaseTransformation from "./BaseTransformation";
import ITransformation from "./ITransformation";

const csvtojson = require("csvtojson");

export default class RopidGTFSTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = RopidGTFS.name;
    }

    /**
     * Transforms data from data source to output format (JSON)
     */
    public TransformDataElement = async (element): Promise<any> => {
        const parsed = await csvtojson({
            noheader: false,
        }).fromString(Buffer.from(element.data).toString("utf8"));
        // chunk into smaller sub arrays
        const total = parsed.length;
        const chunks = [];
        let i = 0;
        const n = parsed.length;
        while (i < n) {
            chunks.push(parsed.slice(i, i += 1000));
        }
        return {
            data: chunks,
            name: element.path.replace(".txt", ""),
            total,
        };
    }

    /**
     * Transforms data from data source to output format (JSON)
     */
    public TransformDataCollection = async (collection): Promise<any> => {
        return new Promise((resolve, reject) => {
            const res = [];
            // collection JS Closure
            const collectionIterator = async (i, cb) => {
                if (collection.length === i) {
                    cb();
                    return;
                }
                const element = await this.TransformDataElement(collection[i]);
                if (element) {
                    res.push(element);
                }
                setImmediate(collectionIterator.bind(null, i + 1, cb));
            };
            collectionIterator(0, () => {
                resolve(res);
            });
        });
    }

}
