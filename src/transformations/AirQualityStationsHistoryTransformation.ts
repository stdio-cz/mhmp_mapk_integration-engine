"use strict";

import { AirQualityStations } from "data-platform-schema-definitions";
import BaseTransformation from "./BaseTransformation";
import ITransformation from "./ITransformation";

export default class AirQualityStationsHistoryTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = AirQualityStations.history.name;
    }

    public transformElement = async (element: any): Promise<any> => {
        const res = {
            code: element.properties.code,
            measurement: element.properties.measurement,
            timestamp: element.properties.timestamp,
        };
        return res;
    }

}
