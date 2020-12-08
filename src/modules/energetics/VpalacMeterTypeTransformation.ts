"use strict";

import { Energetics } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class VpalacMeterTypeTransformation extends BaseTransformation implements ITransformation {
    public name: string;

    constructor() {
        super();
        this.name = Energetics.vpalac.meterType.name;
    }

    protected transformElement = async (element: Record<string, any>): Promise<any> => {
        const res = {
            fir_id: element.fir_id,
            medium: element.medium,
            met_druh: element.met_druh,
            met_id: element.met_id,
            met_kod: element.met_kod,
            met_nazev: element.met_nazev,
            met_ziv: element.met_ziv,
            vyr_zkr: element.vyr_zkr,
        };

        return res;
    }
}
