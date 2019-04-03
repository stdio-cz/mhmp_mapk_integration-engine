"use strict";

import { AirQualityStations } from "data-platform-schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class AirQualityStationsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = AirQualityStations.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            geometry: {
                coordinates: [ parseFloat(element.wgs84_longitude), parseFloat(element.wgs84_latitude)],
                type: "Point",
            },
            properties: {
                code: element.code,
                measurement: {
                    AQ_hourly_index: (element.AQ_hourly_index && element.AQ_hourly_index.value)
                        ? parseInt(element.AQ_hourly_index.value, 10)
                        : null,
                    components: [],
                },
                name: element.name,
                timestamp: new Date().getTime(),
            },
            type: "Feature",
        };
        if (element.measurement) {
            const components = element.measurement.component.map(async (c, i) => {
                const averagedTime = {
                    averaged_hours: (element.measurement.averaged_time[i].averaged_hours)
                        ? parseInt(element.measurement.averaged_time[i].averaged_hours, 10)
                        : null,
                    value: (element.measurement.averaged_time[i].value)
                        ? parseFloat(element.measurement.averaged_time[i].value)
                        : null,
                };
                return {
                    averaged_time: averagedTime,
                    type: c,
                };
            });
            res.properties.measurement.components = await Promise.all(components);
        }
        return res;
    }

    protected transformHistoryElement = async (element: any): Promise<any> => {
        const res = {
            code: element.properties.code,
            measurement: element.properties.measurement,
            timestamp: element.properties.timestamp,
        };
        return res;
    }

}
