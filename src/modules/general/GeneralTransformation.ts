"use strict";

import { GeneralImport } from "golemio-schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class GeneralTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = GeneralImport.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        let data: object;
        if (typeof element.body === "string") {
            data = {
                textData: element.body,
            };
        } else {
            data = element.body;
        }

        const res = {
            data,
            headers: element.headers,
        };

        return res;
    }
}
