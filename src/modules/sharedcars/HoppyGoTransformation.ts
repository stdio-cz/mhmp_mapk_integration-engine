"use strict";

import { SharedCars } from "golemio-schema-definitions";
import { config } from "../../core/config";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class HoppyGoTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = SharedCars.hoppyGo.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const [lat, lon] = element.localization.split(",");
        const res = {
            geometry: {
                coordinates: [ parseFloat(lon), parseFloat(lat) ],
                type: "Point",
            },
            properties: {
                availability: {
                    description: "dle domluvy s provozovatelem",
                    id: 2,
                },
                company: {
                    email: "info@hoppygo.com",
                    name: "HoppyGo",
                    phone: "+420 220 311 769",
                    web: "https://www.hoppygo.com",
                },
                fuel: this.getFuel(element.fuel_description),
                id: element.hash_code.split("?")[0],
                name: element.manufacturer_name,
                res_url: config.HOPPYGO_BASE_URL + element.hash_code,
                updated_at: new Date().getTime(),
            },
            type: "Feature",
        };
        if (element.model_name && element.model_name !== "" && element.model_name !== "Unknown") {
            res.properties.name += " " + element.model_name;
        }
        return res;
    }

    private getFuel = (fuel: string): {description: string, id: number} => {
        switch (fuel) {
            case "diesel":
                return { description: "nafta", id: 2 };
            case "petrol":
                return { description: "benzín", id: 1 };
            case "lpg":
                return { description: "benzín + LPG", id: 3 };
            case "other":
                return { description: "jiný", id: 7 };
            case "electric":
                return { description: "elektřina", id: 4 };
            case "cng":
                return { description: "benzín + CNG", id: 6 };
            default:
                return { description: "neznámý", id: 0 };
        }
    }

}
