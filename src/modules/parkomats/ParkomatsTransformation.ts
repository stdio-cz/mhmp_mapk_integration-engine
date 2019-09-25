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
        const ticketBought = moment.tz(data.dateTime, "Europe/Prague");
        const validityFrom = moment.tz(data.dateFrom, "Europe/Prague");
        const validityTo = moment.tz(data.dateTo, "Europe/Prague");

        const res = {
            channel: data.channel,
            parking_zone: data.section,
            price: data.price,
            ticket_bought: ticketBought.isValid() ? ticketBought.toDate() : null,
            transaction_id: data.id,
            validity_from: validityFrom.isValid() ? validityFrom.toDate() : null,
            validity_to: validityTo.isValid() ? validityTo.toDate() : null,
        };

        return res;
    }
}
