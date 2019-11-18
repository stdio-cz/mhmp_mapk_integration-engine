"use strict";

import { BicycleCounters } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class BicycleCountersEcoCounterTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = BicycleCounters.name + "EcoCounter";
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            geometry: {
                coordinates: [element.longitude, element.latitude],
                type: "Point",
            },
            properties: {
                // userType 2 is counter type bicycles
                directions: element.channels ? element.channels.filter((x) => x.userType === 2)
                    .map((x) => ({
                        id: x.id,
                        name: x.name,
                    })) : [],
                id: "ecoCounter-" + element.id,
                name: element.name,
                route: null,
                updated_at: new Date().getTime(),
            },
            type: "Feature",
        };

        return res;
    }

}
