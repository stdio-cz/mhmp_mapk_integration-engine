"use strict";

import { SharedCars } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class CeskyCarsharingTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = SharedCars.ceskyCarsharing.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            geometry: {
                coordinates: [ parseFloat(element.longitude), parseFloat(element.latitude) ],
                type: "Point",
            },
            properties: {
                availability: {
                    description: "ihned",
                    id: 1,
                },
                company: {
                    email: (element.company_email) ? element.company_email : null,
                    name: element.company_name,
                    phone: (element.company_phone) ? element.company_phone : null,
                    web: element.company_web,
                },
                fuel: {
                    description: (element.fuel_type) ? element.fuel_type : null,
                    id: element.fuel,
                },
                id: element.rz,
                name: element.car_name,
                res_url: element.res_url,
                updated_at: new Date().getTime(),
            },
            type: "Feature",
        };
        return res;
    }

}