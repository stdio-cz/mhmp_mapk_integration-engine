"use strict";

import { Parkomats } from "@golemio/schema-definitions";
import * as moment from "moment";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class ParkomatsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = Parkomats.name;
    }

    protected transformElement = async (data: any): Promise<any> => {
        const ticketBought = data.DateTime ? moment.tz(data.DateTime, "Europe/Prague") : null;
        const validityFrom = data.DateFrom ? moment.tz(data.DateFrom, "Europe/Prague") : null;
        const validityTo = data.DateTo ? moment.tz(data.DateTo, "Europe/Prague") : null;

        const res = {
            channel: data.Channel,
            parking_zone: data.Section,
            price: data.Price,
            ticket_bought: ticketBought && ticketBought.isValid() ? ticketBought.toDate() : null,
            transaction_id: data.Id,
            validity_from: validityFrom && validityFrom.isValid() ? validityFrom.toDate() : null,
            validity_to: validityTo && validityTo.isValid() ? validityTo.toDate() : null,
        };

        return res;
    }
}
