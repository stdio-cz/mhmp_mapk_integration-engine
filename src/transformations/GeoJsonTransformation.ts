"use strict";

import BaseTransformation from "./BaseTransformation";

/**
 * TODO: geoJSON - has specific format, has FeatureCollection, Features,
 * always coordinates, always properties.district?
 */
export default abstract class GeoJsonTransformation extends BaseTransformation {

    /** Transform one single element from input format (from data source) to output format */
    public abstract TransformDataElement;

    constructor() {
        super();
    }

    /**
     * Transforms data from data source to output format (geoJSON FeatureCollection)
     * Creates a FeatureCollection and puts each transformed object as single feature in it
     * (transformation of single objects/features depends on concrete Transformation implementation)
     *
     * @param collection Array of objects to be transformed and saved as single features
     */
    public TransformDataCollection = (collection): Promise<any> => {
        return new Promise((resolve, reject) => {
            const res = {
                features: [],
                type: "FeatureCollection",
            };
            // collection JS Closure
            const collectionIterator = async (i, cb) => {
                if (collection.length === i) {
                    cb();
                    return;
                }
                const element = await this.TransformDataElement(collection[i]);
                res.features.push(element);
                setImmediate(collectionIterator.bind(null, i + 1, cb));
            };
            collectionIterator(0, () => {
                resolve(res);
            });
        });
    }

}
