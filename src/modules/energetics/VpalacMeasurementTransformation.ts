"use strict";

import { Energetics } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class VpalacMeasurementTransformation extends BaseTransformation implements ITransformation {
    public name: string;

    constructor() {
        super();
        this.name = Energetics.vpalac.measurement.name;
    }

    public transform = async (data: any): Promise<any[]> => {
        let res = [];

        for (const { var_id, values } of data) {
            const measurements = values.map(({ timestamp, value }) => ({
                time_measurement: timestamp,
                value,
                var_id,
            }));

            res = [...res, ...measurements];
        }

        return res;
    }

    protected transformElement = async (element: any): Promise<any> => {
        // Nothing to do.
        return;
    }
}
