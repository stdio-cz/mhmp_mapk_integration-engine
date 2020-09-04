"use strict";

import { Parkings } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class KoridParkingConfigTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = Parkings.korid.name + "Config";
    }

    public transform = async (data: any): Promise<any> => {
        const results = [];
        for (const element of data.geojson.features) {
            results.push(this.transformElement({
                ...element,
                time: data.time,
            }));
        }
        return results;
    }

    protected transformElement = (element: any): any => {
        const dateModified = element.time;
        delete element.time;

        return {
            // id: autoincrement
            dataProvider: "www.korid.cz",
            dateModified,
            location: element.geometry,
            name: element.properties.title,
            source: "korid",
            sourceId: "" + element.properties.groupid,
            totalSpotNumber: element.properties.total,
        };
    }
}
