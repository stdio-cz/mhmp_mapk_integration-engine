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
            reason: element.reason,
            result: element.result,
            user_id: element.userId,
        };
        return res;
    }

}
