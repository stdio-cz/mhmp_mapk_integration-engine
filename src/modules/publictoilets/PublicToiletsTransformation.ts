"use strict";

import { PublicToilets } from "golemio-schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class PublicToiletsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = PublicToilets.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            geometry: element.geometry,
            properties: {
                id: element.properties.OBJECTID,
                opened: (element.properties.OTEVRENO)
                    ? element.properties.OTEVRENO.replace(/\r?\n/g, " ")
                    : null,
                price: (element.properties.CENA)
                    ? element.properties.CENA.replace(/\r?\n/g, " ")
                    : null,
                updated_at: new Date().getTime(),
            },
            type: "Feature",
        };
        return res;
    }

}
