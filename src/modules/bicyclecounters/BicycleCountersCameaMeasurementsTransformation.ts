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
        const updatedAt = new Date().getTime();

        const measuredTo = moment.tz(element.datetime, "Europe/Prague");
        const measuredToAsNumber = measuredTo.unix();
        const measuredFrom = measuredTo.clone().subtract(5, "minutes");
        const measuredFromAsNumber = measuredFrom.unix();

        const temperatureValue = element.temperature && !isNaN(parseFloat(element.temperature)) ?
            parseFloat(element.temperature) : null;

        const res = {
            counter_id: null, // assign later
            directions: element.directions ? element.directions.map((x) => ({
                id: x.id,
                value: x.detections,
            })) : [],
            measured_from: measuredFromAsNumber,
            measured_from_iso: measuredFrom.toISOString(),
            measured_to: measuredToAsNumber,
            measured_to_iso: measuredTo.toISOString(),
            temperature: temperatureValue != null ? {
                unit: "°C",
                updated_at: updatedAt,
                value: temperatureValue,
            } : null,
            updated_at: updatedAt,
        };

        return res;
    }

}
