"use strict";

import { PublicToilets } from "data-platform-schema-definitions";
import BaseTransformation from "./BaseTransformation";
import ITransformation from "./ITransformation";

export default class PublicToiletsTransformation extends BaseTransformation implements ITransformation {

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
                timestamp: new Date().getTime(),
            },
            type: "Feature",
        };
        return res;
    }

}
