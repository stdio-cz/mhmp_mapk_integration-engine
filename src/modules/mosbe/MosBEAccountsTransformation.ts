"use strict";

import { MOS } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class MosBEAccountsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = MOS.BE.accounts.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            count: parseInt(element.count, 10),
            day: element.day,
        };
        return res;
    }

}
