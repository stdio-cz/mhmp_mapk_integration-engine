"use strict";

import { BicycleCounters } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class CameaTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = BicycleCounters.camea.name;
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

    protected transformElement = async (element: any): Promise<{location: any, directions: any[]}> => {
        const res = {
            directions: element.directions
                ? element.directions.map((direction) => ({
                    id: "camea-" + direction.id,
                    locations_id: "camea-" + element.bikecounter,
                    name: direction.name,
                    vendor_id: direction.id,
                }))
                : [],
            location: {
                id: "camea-" + element.bikecounter,
                lat: element.lat,
                lng: element.lon,
                name: element.name,
                route: element.route,
                vendor_id: element.bikecounter,
            },
        };
        return res;
    }

}
