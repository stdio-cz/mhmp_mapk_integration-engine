"use strict";

import { CityDistricts } from "data-platform-schema-definitions";
import GeoJsonTransformation from "./GeoJsonTransformation";
import ITransformation from "./ITransformation";

const slug = require("slugify");

export default class CityDistrictsTransformation extends GeoJsonTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = CityDistricts.name;
    }

    /**
     * Transforms data from data source to output format (JSON)
     */
    public TransformDataElement = async (element): Promise<any> => {
        return {
            geometry: {
                coordinates: element.geometry.coordinates,
                type: element.geometry.type,
            },
            properties: {
                id: parseInt(element.properties.KOD_MC, 10),
                name: element.properties.NAZEV_MC,
                slug: slug(element.properties.NAZEV_MC, { lower: true }),
                timestamp: new Date().getTime(),
            },
            type: element.type,
        };
    }

}
