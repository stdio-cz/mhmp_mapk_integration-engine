"use strict";

import { MedicalInstitutions } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

const slug = require("slugify");

export class HealthCareTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = MedicalInstitutions.healthCare.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            geometry: {
                coordinates: [parseFloat(element.Lng), parseFloat(element.Lat)],
                type: "Point",
            },
            properties: {
                address: {
                    address_country: "Česko",
                    address_formatted: element.Ulice + " " + element.CisloDomovniOrientacni + ", "
                        + element.Psc + " " + element.Obec + ", Česko",
                    address_locality: element.Obec,
                    postal_code: element.Psc,
                    street_address: element.Ulice + " " + element.CisloDomovniOrientacni,
                },
                email: (element.PoskytovatelEmail) ? element.PoskytovatelEmail.trim().split(",") : [],
                id: slug(element.ZdravotnickeZarizeniId + "-" + element.NazevZarizeni,
                    { lower: true, remove: /[*+~.()'"!:@]/g }),
                institution_code: element.ZdravotnickeZarizeniId,
                name: element.NazevZarizeni,
                opening_hours: [],
                pharmacy_code: null,
                telephone: (element.PoskytovatelTelefon) ? element.PoskytovatelTelefon.trim().split(",") : [],
                type: {
                    description: element.DruhZarizeni,
                    group: "health_care",
                    id: this.getTypeId(element.DruhZarizeni),
                },
                updated_at: new Date().getTime(),
                web: (element.PoskytovatelWeb) ? element.PoskytovatelWeb.trim().split(",") : [],
            },
            type: "Feature",
        };
        return res;
    }

    /**
     * Getting type id from type description. Description comes from datasource.
     * The key is created from abbr of `Zdravotní Služba` -> `ZS` + dash + abbr of description.
     */
    private getTypeId = (type: string): string => {
        switch (type) {
            case "Fakultní nemocnice":
                return "ZS-FN";
            case "Nemocnice":
                return "ZS-N";
            case "Nemocnice následné péče":
                return "ZS-NNP";
            case "Ostatní ambulantní zařízení":
                return "ZS-OAZ";
            case "Ostatní zdravotnická zařízení":
                return "ZS-OZZ";
            case "Ostatní zvláštní zdravotnická zařízení":
                return "ZS-OZZZ";
            case "Výdejna zdravotnických prostředků":
                return "ZS-VZP";
            case "Záchytná stanice":
                return "ZS-ZS";
            case "Zdravotní záchranná služba":
                return "ZS-ZZS";
            case "Zdravotnické středisko":
                return "ZS-ZDS";
            default:
                return "ZS";
        }
    }

}
