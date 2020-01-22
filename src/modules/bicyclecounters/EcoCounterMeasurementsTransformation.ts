"use strict";

import { BicycleCounters } from "@golemio/schema-definitions";
import * as moment from "moment";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class EcoCounterMeasurementsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = BicycleCounters.ecoCounter.name + "Measurements";
    }

    protected transformElement = async (element: any): Promise<any> => {
        // Repair UTC date, because EcoCounter API is actually working with local Europe/Prague time, not ISO!!!
        // Returned value 07:00:00+0000 is some hybrid between UTC time with offset 07:00:00+0100 and pure UTC
        // 06:00:00+0000
        const utcDate = moment.tz(element.date.split("+")[0], "Europe/Prague");

        const measuredFrom = utcDate;
        const measuredTo = measuredFrom.clone().add(15, "minutes");

        const res = {
            directions_id: null,
            locations_id: null,
            measured_from: measuredFrom.valueOf(),
            measured_to: measuredTo.valueOf(),
            value: element.counts,
        };

        return res;
    }

}
