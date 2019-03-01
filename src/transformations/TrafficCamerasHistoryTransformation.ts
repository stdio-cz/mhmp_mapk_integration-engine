"use strict";

import { TrafficCameras } from "data-platform-schema-definitions";
import BaseTransformation from "./BaseTransformation";
import ITransformation from "./ITransformation";

export default class TrafficCamerasHistoryTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = TrafficCameras.history.name;
    }

    public transformElement = async (element: any): Promise<any> => {
        const res = {
            id: element.properties.id,
            image: element.properties.image,
            last_updated: element.properties.last_updated,
            timestamp: new Date().getTime(),
        };
        return res;
    }

}
