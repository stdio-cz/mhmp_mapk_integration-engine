"use strict";

import BasePipeline from "./BasePipeline";
import IPipeline from "./IPipeline";

const config = require("../../config.js");
const slug = require("slugify");

export default class CityDistrictsPipeline extends BasePipeline implements IPipeline {

    public name: string;

    constructor() {
        super();
        this.name = "CityDistricts";
    }

    /**
     * Transforms data from data source to output format (JSON)
     */
    public TransformDataElement = async (element): Promise<any> => {
        return {
            id: parseInt(element.properties.KOD_MC, 10),
            loc: {
                coordinates: element.geometry.coordinates,
                type: element.geometry.type,
            },
            name: element.properties.NAZEV_MC,
            slug: slug(element.properties.NAZEV_MC, { lower: true }),
        };
    }

    /**
     * Transforms data from data source to output format (JSON)
     */
    public TransformDataCollection = (collection): Promise<any> => {
        return new Promise((resolve, reject) => {
            const res = [];
            // collection JS Closure
            const collectionIterator = async (i, cb) => {
                if (collection.length === i) {
                    cb();
                    return;
                }
                const element = await this.TransformDataElement(collection[i]);
                res.push(element);
                setImmediate(collectionIterator.bind(null, i + 1, cb));
            };
            collectionIterator(0, () => {
                resolve(res);
            });
        });
    }

}
