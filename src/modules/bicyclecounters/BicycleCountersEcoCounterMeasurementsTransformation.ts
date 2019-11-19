"use strict";

import { BicycleCounters } from "@golemio/schema-definitions";
import * as moment from "moment";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class BicycleCountersEcoCounterMeasurementsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = BicycleCounters.name + "EcoCounterMeasurements";
    }

    protected transformElement = async (element: any): Promise<any> => {
        const updatedAt = new Date().getTime();

        // Repair UTC date, because EcoCounter API is actually working with local Europe/Prague time, not ISO!!!
        // Returned value 07:00:00+0000 is some hybrid between UTC time with offset 07:00:00+0100 and pure UTC
        // 06:00:00+0000
        const wrongUtcDate = moment.utc(element.date);
        // repairing offset
        const repairedUtcDate = moment(wrongUtcDate.format("YYYY-MM-DDTHH:mm:ss")).tz("Europe/Prague");

        const measuredFrom = repairedUtcDate;
        const measuredTo = measuredFrom.clone().add(15, "minutes");

        const res = {
            counter_id: null, // assign later
            directions: [{
                id: null, // assign later
                value: element.counts,
            }],
            measured_from: measuredFrom.valueOf(),
            measured_to: measuredTo.valueOf(),
            temperature: null,
            updated_at: updatedAt,
        };

        return res;
    }

}
