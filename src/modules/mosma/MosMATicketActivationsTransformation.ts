"use strict";

import { MOS } from "golemio-schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class MosMATicketActivationsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = MOS.MA.ticketActivations.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            account_id: element.accountId,
            cptp: element.cptp,
            date: element.date,
            lat: element.lat,
            lon: element.lon,
            ticket_id: element.ticketId,
            type: element.type,
        };
        return res;
    }

}
