"use strict";

import { BicycleCounters } from "@golemio/schema-definitions";
import * as moment from "moment";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class BicycleCountersCameaMeasurementsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = BicycleCounters.name + "CameaMeasurements";
    }

    protected transformElement = async (element: any): Promise<any> => {
        const measuredTo = moment.tz(element.datetime, "Europe/Prague");
        const measuredFrom = measuredTo.clone().subtract(5, "minutes");

        const res = {
            counter_id: null, // assign later
            directions: element.directions ? element.directions.map((x) => ({
                id: x.id,
                value: x.detections,
            })) : [],
            measured_from: measuredFrom.valueOf(),
            measured_to: measuredTo.valueOf(),
            temperature: element.temperature && !isNaN(parseFloat(element.temperature))
                ? {
                    unit: "°C",
                    value: parseFloat(element.temperature),
                } : null,
            updated_at: new Date().getTime(),
        };

        return res;
    }

}
