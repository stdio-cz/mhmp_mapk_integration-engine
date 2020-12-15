"use strict";

import * as _ from "lodash";

import { Energetics, EnergeticsTypes } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

import EnesaDevices = EnergeticsTypes.Enesa.Devices;

export class EnesaEnergyDevicesTransformation extends BaseTransformation implements ITransformation {
    public name: string;

    constructor() {
        super();
        this.name = Energetics.enesa.devices.name;
    }

    protected transformElement = async (element: EnesaDevices.InputElement): Promise<EnesaDevices.OutputElement> => {
        const res: EnesaDevices.OutputElement = {
            addr: _.toString(element.addr),
            building_id: element.buildingId,
            category: _.toString(element.category),
            deleted: _.toString(element.deleted),
            description: _.toString(element.description),
            id: element.id,
            include_in_evaluation: _.toString(element.includeInEvaluation),
            location_description: _.toString(element.locationDescription),
            location_number: _.toString(element.locationNumber),
            meter_index: _.toString(element.meterIndex),
            meter_number: _.toString(element.meterNumber),
            meter_type: _.toString(element.meterType),
            replaced_meter_id: _.toString(element.replacedMeterId),
            unit: _.toString(element.unit),
        };

        return res;
    }
}
