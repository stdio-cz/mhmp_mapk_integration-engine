"use strict";

import { MedicalInstitutions } from "golemio-schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

const slug = require("slugify");

export class HealthCareTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = MedicalInstitutions.healthCare.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const coords = element.poskytovatel_souřadnice.replace("POINT(", "").replace(")", "").split(" ");
        const res = {
            geometry: {
                coordinates: [parseFloat(coords[1]), parseFloat(coords[0])],
                type: "Point",
            },
            properties: {
                address: {
                    address_country: "Česko",
                    address_formatted: element.adresa_název_ulice + " " + element.adresa_číslo_domovní + ", "
                        + element.adresa_psč + " " + element.adresa_název_obce + ", Česko",
                    address_locality: element.adresa_název_obce,
                    postal_code: element.adresa_psč,
                    street_address: element.adresa_název_ulice + " " + element.adresa_číslo_domovní,
                },
                email: (element.kontakt_email) ? element.kontakt_email.trim().split(",") : [],
                id: slug(element.id + "-" + element.název, {lower: true}),
                institution_code: element.id,
                name: element.název,
                opening_hours: [],
                pharmacy_code: null,
                telephone: (element.kontakt_telefon) ? element.kontakt_telefon.trim().split(",") : [],
                type: {
                    description: element.typ,
                    group: "health_care",
                    id: this.getTypeId(element.typ),
                },
                updated_at: new Date().getTime(),
                web: (element.kontakt_url) ? element.kontakt_url.trim().split(",") : [],
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
