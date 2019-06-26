"use strict";

import { MOS } from "golemio-schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class MosMATicketPurchasesTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = MOS.MA.ticketPurchases.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            account_id: element.accountId,
            cptp: element.cptp,
            date: element.date,
            duration: element.duration,
            lat: (element.lat) ? parseFloat(element.lat) : null,
            lon: (element.lat) ? parseFloat(element.lon) : null,
            tariff_id: element.tariffId,
            tariff_name: element.tariffName,
            ticket_id: element.ticketId,
            zone_count: element.zoneCount,
        };
        return res;
    }

}
