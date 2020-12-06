"use strict";

import { Energetics } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class VpalacMeasuringEquipmentTransformation extends BaseTransformation implements ITransformation {
    public name: string;

    constructor() {
        super();
        this.name = Energetics.vpalac.measuringEquipment.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {}; // TODO implement

        return res;
    }

}
