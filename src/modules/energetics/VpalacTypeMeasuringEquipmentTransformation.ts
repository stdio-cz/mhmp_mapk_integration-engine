"use strict";

import { Energetics } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class VpalacTypeMeasuringEquipmentTransformation extends BaseTransformation implements ITransformation {
    public name: string;

    constructor() {
        super();
        this.name = Energetics.vpalac.typeMeasuringEquipment.name;
    }

    protected transformElement = async (element: Record<string, any>): Promise<any> => {
        const res = {
            cik_akt: element.cik_akt,
            cik_char: element.cik_char,
            cik_cislo: element.cik_cislo,
            cik_cislo2: element.cik_cislo2,
            cik_double: element.cik_double,
            cik_fk: element.cik_fk,
            cik_nazev: element.cik_nazev,
            cik_zprac: element.cik_zprac,
            lt_key: element.lt_key,
        };

        return res;
    }
}
