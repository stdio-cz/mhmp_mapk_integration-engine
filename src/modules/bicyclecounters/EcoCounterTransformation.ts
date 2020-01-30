"use strict";

import { BicycleCounters } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class EcoCounterTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = BicycleCounters.ecoCounter.name;
    }

    /**
     * Overrides BaseTransformation::transform
     */
    public transform = async (data: any | any[]): Promise<{directions: any[], locations: any[]}> => {
        const res = {
            directions: [],
            locations: [],
        };

        if (data instanceof Array) {
            const promises = data.map(async (element, i) => {
                const elemRes = await this.transformElement(element);
                if (elemRes) {
                    res.directions = res.directions.concat(elemRes.directions);
                    res.locations.push(elemRes.location);
                }
                return;
            });
            await Promise.all(promises);
            return res;
        } else {
            const elemRes = await this.transformElement(data);
            if (elemRes) {
                res.directions = res.directions.concat(elemRes.directions);
                res.locations.push(elemRes.location);
            }
            return res;
        }
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            directions: element.channels
                ? element.channels
                .filter((direction) => direction.userType === 2)
                .map((direction) => ({
                    id: "ecoCounter-" + direction.id,
                    locations_id: "ecoCounter-" + element.id,
                    name: direction.name,
                    vendor_id: direction.id,
                }))
                : [],
            location: {
                id: "ecoCounter-" + element.id,
                lat: element.latitude,
                lng: element.longitude,
                name: element.name,
                route: null,
                vendor_id: element.id,
            },
        };

        return res;
    }

}
