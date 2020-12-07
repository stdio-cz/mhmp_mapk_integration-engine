"use strict";

import { Energetics } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class VpalacMeasuringEquipmentTransformation extends BaseTransformation implements ITransformation {
    public name: string;

    constructor() {
        super();
        this.name = Energetics.vpalac.measuringEquipment.name;
    }

    protected transformElement = async (element: Record<string, any>): Promise<any> => {
        const res = {
            me_do: element.me_do,
            me_extid: element.me_extid,
            me_fakt: element.me_fakt,
            me_id: element.me_id,
            me_od: element.me_od,
            me_plom: element.me_plom,
            me_serial: element.me_serial,
            me_zapoc: element.me_zapoc,
            met_id: element.met_id,
            mis_id: element.mis_id,
            mis_nazev: element.mis_nazev,
            poc_typode: element.poc_typode,
            pot_id: element.pot_id,
            umisteni: element.umisteni,
            var_id: element.var_id,
        };

        return res;
    }
}
