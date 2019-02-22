"use strict";

import { IceGatewaySensors } from "data-platform-schema-definitions";
import BaseTransformation from "./BaseTransformation";
import ITransformation from "./ITransformation";

export default class IceGatewaySensorsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = IceGatewaySensors.name;
    }

    public transformElement = async (element: any): Promise<any> => {
        const res = {
            geometry: {
                coordinates: [ parseFloat(element.longitude), parseFloat(element.latitude) ],
                type: "Point",
            },
            properties: {
                id: element.ice_id,
                sensors: [],
                timestamp: new Date().getTime(),
            },
            type: "Feature",
        };

        /// Parsing sensors to array using recursion.
        const parseSensors = (obj: any, ary: any[], name?: string) => {
            /// if object contains validity then sensor is push to ary and recursion ends
            if (obj.validity !== undefined) {
                ary.push({...{sensor_type: name}, ...obj});
                return;
            }

            /// sensor identifier (sensor_type)
            let newName: string;

            /// goes through all object keys and calls function for sub-objects
            Object.keys(obj).map((key) => {
                if (!name) {
                    newName = key;
                } else if (key !== "latest_data") {
                    newName = name + "." + key;
                } else {
                    newName = name;
                }
                // recursion is called if sub-element is object
                if (obj[key] && typeof obj[key] === "object" && obj[key].constructor === Object) {
                    parseSensors(obj[key], ary, newName);
                }
            });
        };
        /// first call of the recursion
        parseSensors(element.sensors, res.properties.sensors);
        return res;
    }

}
