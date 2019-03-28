"use strict";

import { MunicipalPoliceStations } from "data-platform-schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

const slug = require("slugify");

export class MunicipalPoliceStationsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = MunicipalPoliceStations.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            geometry: element.geometry,
            properties: {
                cadastral_area: element.properties.NKU,
                id: slug(element.properties.NKU + "-" + element.properties.NVPK + "-" + element.properties.CPOP,
                    { lower: true }),
                note: (element.properties.POZN) ? element.properties.POZN : null,
                timestamp: new Date().getTime(),
            },
            type: "Feature",
        };
        return res;
    }

}
