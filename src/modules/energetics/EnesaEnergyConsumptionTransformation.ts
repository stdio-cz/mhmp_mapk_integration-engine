"use strict";

import * as _ from "lodash";

import { Energetics, EnergeticsTypes } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

import EnesaConsumption = EnergeticsTypes.Enesa.Consumption;

export class EnesaEnergyConsumptionTransformation extends BaseTransformation implements ITransformation {
    public name: string;

    constructor() {
        super();
        this.name = Energetics.enesa.consumption.name;
    }

    protected transformElement = async (
        element: EnesaConsumption.InputElement,
    ): Promise<EnesaConsumption.OutputElement> => {
        const res: EnesaConsumption.OutputElement = {
            // PK
            addr: element.addr,
            meter: _.toString(element.meter),
            time_utc: element.timeUtc,
            var: _.toString(element.var),

            commodity: element.commodity,
            type: element.type,
            unit: element.unit,
            value: _.toNumber(element.value),
        };

        return res;
    }
}
