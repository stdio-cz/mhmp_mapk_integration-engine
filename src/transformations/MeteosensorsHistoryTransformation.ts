"use strict";

import { Meteosensors } from "data-platform-schema-definitions";
import BaseTransformation from "./BaseTransformation";
import ITransformation from "./ITransformation";

export default class MeteosensorsHistoryTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = Meteosensors.history.name;
    }

    public transformElement = async (element: any): Promise<any> => {
        const res = {
            air_temperature: element.properties.air_temperature,
            humidity: element.properties.humidity,
            id: element.properties.id,
            last_updated: element.properties.last_updated,
            road_temperature: element.properties.road_temperature,
            timestamp: element.properties.timestamp,
            wind_direction: element.properties.wind_direction,
            wind_speed: element.properties.wind_speed,
        };
        return res;
    }

}
