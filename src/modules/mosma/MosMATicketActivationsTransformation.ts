"use strict";

import { MOS } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class MosMATicketActivationsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = MOS.MA.ticketActivations.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            date: element.date,
            lat: (element.lat) ? parseFloat(element.lat) : null,
            lon: (element.lon) ? parseFloat(element.lon) : null,
            ticket_id: element.ticketId,
            type: element.type,
            zones: element.zones,
        };
        return res;
    }

}