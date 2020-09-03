"use strict";

import { Parkings } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class KoridParkingConfigTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = Parkings.korid.name;
    }

    public transform = async (data: any): Promise<any> => {
        const promises = [];
        for (const element of data.geojson.features) {
            promises.push(await this.transformElement(element, data.time));
        }
        return Promise.all(promises);
    }

    protected transformElement = async (element: any, dateModified?: number): Promise<any> => {
        const res = {
            dataProvider: "korid",
            dateModified: new Date(dateModified), // time
            name: element.properties.title, // title
            sourceId: Number(element.properties.groupid), // groupId
        };
        return res;
    }
}
