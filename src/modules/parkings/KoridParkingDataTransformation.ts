"use strict";

import { Parkings } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class KoridParkingDataTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = Parkings.korid.name + "Data";
    }

    public transform = async (data: any): Promise<any> => {
        const results = [];
        for (const elementKey in data.data) {
            if (data.data.hasOwnProperty(elementKey)) {
                results.push(this.transformElement({
                    ...data.data[elementKey],
                    sourceId: elementKey,
                    time: data.time,
                }));
            }
        }
        return results;
    }

    protected transformElement = (element: any): any => {
        const dateModified = element.time;
        delete element.time;
        const sourceId = element.sourceId;
        delete element.sourceId;

        return {
            // id: autoincrement
            availableSpotNumber: element.fr,
            closedSpotNumber: element.cls,
            dateModified,
            occupiedSpotNumber: element.occ,
            source: "korid",
            sourceId: "" + sourceId,
            totalSpotNumber: element.tot,
        };
    }
}
