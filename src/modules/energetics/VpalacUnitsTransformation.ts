"use strict";

import { Energetics } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class VpalacUnitsTransformation extends BaseTransformation implements ITransformation {
    public name: string;

    constructor() {
        super();
        this.name = Energetics.vpalac.units.name;
    }

    protected transformElement = async (element: Record<string, any>): Promise<any> => {
        const res = {
            jed_id: element.jed_id,
            jed_nazev: element.jed_nazev,
            jed_zkr: element.jed_zkr,
            lt_key: element.lt_key,
            pot_defcolor: element.pot_defcolor,
            pot_id: element.pot_id,
            pot_type: element.pot_type,
            ptv_id: element.ptv_id,
        };

        return res;
    }
}
