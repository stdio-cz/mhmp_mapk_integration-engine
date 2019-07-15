"use strict";

const moment = require("moment");

import { ZtpParkings } from "golemio-schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class ZtpParkingsInputTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = ZtpParkings.name + "Input";
    }

    protected transformElement = async (element: any): Promise<any> => {
        const lastUpdated = moment.tz(element.last_updated, "Europe/Prague");
        const lastUpdatedAsNumber = lastUpdated.valueOf();

        const res = {
            properties: {
                device_id: element.device,
                failure: element.status === 2,
                id: element.id,
                last_updated_at: lastUpdatedAsNumber,
                occupied: element.status === 0 ? false : element.status === 1 ? true : null,
            },
        };
        return res;
    }

}
