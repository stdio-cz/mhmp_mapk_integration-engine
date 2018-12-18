"use strict";

import { IceGatewaySensors } from "data-platform-schema-definitions";
import BaseTransformation from "./BaseTransformation";
import ITransformation from "./ITransformation";

export default class IceGatewaySensorsHistoryTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = IceGatewaySensors.history.name;
    }

    /**
     * Transforms data from data source to output format (geoJSON Feature)
     */
    public TransformDataElement = async (element): Promise<any> => {
        const filteredSensors = element.properties.sensors.filter((s) => s.validity === 0);
        const res = {
            id: element.properties.id,
            sensors: filteredSensors,
            timestamp: element.properties.timestamp,
        };
        return res;
    }

    /**
     * Transforms data from data source to output format
     * Creates a ollection and puts each transformed object as single feature in it
     * (transformation of single objects/features depends on concrete Transformation implementation)
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
                if (element.sensors.length !== 0) {
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
