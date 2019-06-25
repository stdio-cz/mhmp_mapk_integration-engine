"use strict";

import { MOS } from "golemio-schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class MosMATicketInspectionsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = MOS.MA.ticketInspections.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            date: element.date,
            lat: (element.lat) ? parseFloat(element.lat) : null,
            lon: (element.lon) ? parseFloat(element.lon) : null,
            reason: element.reason,
            result: element.result,
            user_id: element.userId,
        };
        return res;
    }

}
