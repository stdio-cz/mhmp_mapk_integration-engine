"use strict";

import { Energetics } from "@golemio/schema-definitions";
import * as lodash from "lodash";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class VpalacMeasurementTransformation extends BaseTransformation implements ITransformation {
    public name: string;

    constructor() {
        super();
        this.name = Energetics.vpalac.measurement.name;
    }

    public transform = async (data: any): Promise<any[]> => {
        const { var_id, values } = data;

        const res = lodash
            .chain(values)
            .uniqBy("timestamp")
            .map(({ timestamp, value }) => ({
                time_measurement: timestamp,
                value,
                var_id,
            }))
            .value();

        return res;
    }

    protected transformElement = async (element: any): Promise<any> => {
        // Nothing to do.
        return;
    }
}
