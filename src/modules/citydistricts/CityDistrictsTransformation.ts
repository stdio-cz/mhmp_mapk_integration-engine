"use strict";

import { CityDistricts } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

const slug = require("slugify");

export class CityDistrictsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = CityDistricts.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        return {
            geometry: {
                coordinates: element.geometry.coordinates,
                type: element.geometry.type,
            },
            properties: {
                id: parseInt(element.properties.KOD_MC, 10),
                name: element.properties.NAZEV_MC,
                slug: slug(element.properties.NAZEV_MC, { lower: true }),
                updated_at: new Date().getTime(),
            },
            type: element.type,
        };
    }

}
