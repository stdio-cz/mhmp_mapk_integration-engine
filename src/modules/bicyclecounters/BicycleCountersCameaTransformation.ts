"use strict";

import { BicycleCounters } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class BicycleCountersCameaTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = BicycleCounters.name + "Camea";
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            geometry: {
                coordinates: [element.lon, element.lat],
                type: "Point",
            },
            properties: {
                directions: element.directions ? element.directions.map((x) => ({
                    id: x.id,
                    name: x.name,
                })) : [],
                id: "camea-" + element.bikecounter,
                name: element.name,
                route: element.route,
                updated_at: new Date().getTime(),
            },
            type: "Feature",
        };

        return res;
    }

}
