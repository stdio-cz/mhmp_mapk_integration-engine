"use strict";

import { Parkings } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class KoridParkingDataTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = Parkings.korid.name;
    }

    public transform = async (data: any): Promise<any> => {
        const promises = [];
        for (const elementKey in data) {
            if (data.hasOwnProperty(elementKey)) {
                promises.push(await this.transformElement(data[elementKey], elementKey));
            }
        }
        return Promise.all(promises);
    }

    protected transformElement = async (element: any, elementKey?: any): Promise<any> => {
        const res = {
            availableSpotNumber: Number(element.fr),
            config: Number(elementKey),
            totalSpotNumber: Number(element.tot),
        };
        return Promise.resolve(res);
    }
}
