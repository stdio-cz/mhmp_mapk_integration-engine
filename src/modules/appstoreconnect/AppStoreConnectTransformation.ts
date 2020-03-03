"use strict";

import { AppStoreConnect } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class AppStoreConnectTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = AppStoreConnect.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            begin: element["Begin Date"],
            identifier: element.SKU,
            product: element.Title,
            units: element.Units,
            version: element.Version,
        };
        return res;
    }
}
