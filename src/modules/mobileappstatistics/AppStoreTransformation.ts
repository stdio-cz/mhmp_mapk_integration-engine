"use strict";

import { MobileAppStatistics } from "@golemio/schema-definitions";
import * as moment from "moment-timezone";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class AppStoreTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = MobileAppStatistics.appStore.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            app_id: element.SKU,
            app_name: element.Title,
            begin_day: moment.tz(element["Begin Date"], "MM/DD/YYYY", "Europe/Prague").format("YYYY-MM-DD"),
            country: element["Country Code"],
            device: element.Device,
            event_count: parseInt(element.Units, 10),
            event_type: element["Product Type Identifier"],
            version: element.Version,
        };
        return res;
    }
}
