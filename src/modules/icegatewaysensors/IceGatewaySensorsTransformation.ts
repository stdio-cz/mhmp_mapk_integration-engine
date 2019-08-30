"use strict";

import { IceGatewaySensors } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class IceGatewaySensorsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = IceGatewaySensors.name;
    }

    /**
     * Overrides BaseTransformation::transformHistory
     */
    public transformHistory = async (data: any|any[]): Promise<any|any[]> => {
        if (data instanceof Array) {
            const promises = data.map((element) => {
                return this.transformHistoryElement(element);
            });
            const results = await Promise.all(promises);
            // in this case the transformHistoryElement() returns array or null
            const filtered = results.filter((r) => r); // null values are deleted
            return Array.prototype.concat(...filtered); // concatenating all sub-arrays to one array
        } else {
            return this.transformHistoryElement(data);
        }
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            geometry: {
                coordinates: [ parseFloat(element.longitude), parseFloat(element.latitude) ],
                type: "Point",
            },
            properties: {
                id: element.ice_id,
                sensors: [],
                updated_at: new Date().getTime(),
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

    protected transformHistoryElement = async (element: any): Promise<any> => {
        const filteredSensors = element.properties.sensors.filter((s) => s.validity === 0);
        return filteredSensors.map((sensor) => {
            sensor.created_at = sensor.created_at * 1000;
            return { ...sensor, id: element.properties.id, updated_at: element.properties.updated_at };
        });
    }

}
