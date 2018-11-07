"use strict";

import BasePipeline from "./BasePipeline";
import IPipeline from "./IPipeline";

export default class ParkingsHistPipeline extends BasePipeline implements IPipeline {

    public name: string;

    constructor() {
        super();
        this.name = "ParkingsHist";
    }

    /**
     * Transforms data from data source to output format (geoJSON Feature)
     */
    public TransformDataElement = async (element): Promise<any> => {
        const res = {
            id: element.properties.id,
            num_of_free_places: element.properties.num_of_free_places,
            num_of_taken_places: element.properties.num_of_taken_places,
            timestamp: new Date().getTime(),
            total_num_of_places: element.properties.total_num_of_places,
        };
        return res;
    }

    /**
     * Transforms data from data source to output format
     * Creates a ollection and puts each transformed object as single feature in it
     * (transformation of single objects/features depends on concrete Pipeline implementation)
     *
     * @param collection Array of objects to be transformed and saved as single features
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
