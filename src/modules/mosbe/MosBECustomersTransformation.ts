"use strict";

import { MOS } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class MosBECustomersTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = MOS.BE.customers.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            customer_id: parseInt(element.CustomerID, 10),
            date_of_birth: element.DateOfBirth,
        };
        return res;
    }

}
