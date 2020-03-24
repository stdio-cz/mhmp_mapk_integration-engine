"use strict";

import { MobileAppStatistics } from "@golemio/schema-definitions";
import * as moment from "moment-timezone";
import { CSVDataTypeStrategy } from "../../core/datasources";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class PlayStoreTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = MobileAppStatistics.playStore.name;
    }

    /**
     * Overrides BaseTransformation::transform
     */
    public transform = async (data: any|any[]): Promise<any|any[]> => {
        let toTransform = data.map(async (file) => {
            return this.transformFile(file);
        });
        toTransform = [].concat(...await Promise.all(toTransform));

        if (toTransform instanceof Array) {
            const promises = toTransform.map((element) => {
                return this.transformElement(element);
            });
            const results = await Promise.all(promises);
            return results.filter((r) => r);
        } else {
            return this.transformElement(toTransform);
        }
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            begin_day: moment.tz(element.Date, "YYYY-MM-DD", "Europe/Prague").format("YYYY-MM-DD"),
            daily_device_installs: (element["Daily Device Installs"])
                ? parseInt(element["Daily Device Installs"], 10)
                : null,
            daily_user_installs: (element["Daily User Installs"])
                ? parseInt(element["Daily User Installs"], 10)
                : null,
            install_events: (element["Install events"])
                ? parseInt(element["Install events"], 10)
                : null,
            package_name: element["Package Name"],
        };
        return res;
    }

    private transformFile = async (file: any): Promise<any> => {
        const csvDataTypeStrategy = new CSVDataTypeStrategy({
                fastcsvParams: { headers: true },
                subscribe: ((json: any) => json),
            });
        return csvDataTypeStrategy.parseData(file.data);
    }

}
