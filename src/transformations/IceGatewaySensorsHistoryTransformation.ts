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

    public transformElement = async (element: any): Promise<any> => {
        const filteredSensors = element.properties.sensors.filter((s) => s.validity === 0);
        const res = {
            id: element.properties.id,
            sensors: filteredSensors,
            timestamp: element.properties.timestamp,
        };
        if (res.sensors.length === 0) {
            return null;
        }
        return res;
    }

}
