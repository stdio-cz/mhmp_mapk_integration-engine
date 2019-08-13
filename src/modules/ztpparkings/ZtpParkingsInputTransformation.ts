"use strict";

const moment = require("moment");

import { ZtpParkings } from "golemio-schema-definitions";
import { log } from "../../core/helpers";
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

        const status = parseInt(element.status, 10);
        const id = parseInt(element.id, 10);
        if (isNaN(id)) {
            log.error("ID must be a valid number.");
        }
        if (isNaN(status)) {
            log.error("Status must be a valid number.");
        }
        const res = {
            properties: {
                device_id: element.device,
                failure: status === 2,
                id,
                last_updated_at: lastUpdatedAsNumber,
                occupied: status === 0 ? false : status === 1 ? true : null,
            },
        };
        return res;
    }

}
