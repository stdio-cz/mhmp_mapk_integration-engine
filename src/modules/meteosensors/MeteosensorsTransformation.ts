"use strict";

import { Meteosensors } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class MeteosensorsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = Meteosensors.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            geometry: {
                coordinates: [ parseFloat(element.lng), parseFloat(element.lat) ],
                type: "Point",
            },
            properties: {
                air_temperature: null,
                humidity: null,
                id: element.id,
                last_updated: !isNaN(parseInt(element.lastUpdated, 10))
                    ? parseInt(element.lastUpdated, 10)
                    : null,
                name: (element.name.split("-")[1] && element.name.split("-")[1] !== "")
                    ? element.name.split("-")[1]
                    : element.name,
                road_temperature: null,
                updated_at: new Date().getTime(),
                wind_direction: null,
                wind_speed: null,
            },
            type: "Feature",
        };
        if (element.airTemperature && !isNaN(parseFloat(element.airTemperature))) {
            res.properties.air_temperature = parseFloat(element.airTemperature);
        }
        if (element.roadTemperature && !isNaN(parseFloat(element.roadTemperature))) {
            res.properties.road_temperature = parseFloat(element.roadTemperature);
        }
        if (element.humidity && !isNaN(parseInt(element.humidity, 10))) {
            res.properties.humidity = parseInt(element.humidity, 10);
        }
        if (element.windDirection && !isNaN(parseInt(element.windDirection, 10))) {
            res.properties.wind_direction = parseInt(element.windDirection, 10);
        }
        if (element.windSpeed && !isNaN(parseFloat(element.windSpeed))) {
            res.properties.wind_speed = parseFloat(element.windSpeed);
        }
        return res;
    }

    protected transformHistoryElement = async (element: any): Promise<any> => {
        const res = {
            air_temperature: element.properties.air_temperature,
            humidity: element.properties.humidity,
            id: element.properties.id,
            last_updated: element.properties.last_updated,
            road_temperature: element.properties.road_temperature,
            updated_at: element.properties.updated_at,
            wind_direction: element.properties.wind_direction,
            wind_speed: element.properties.wind_speed,
        };
        return res;
    }

}
