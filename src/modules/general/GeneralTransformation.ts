"use strict";

import { GeneralImport } from "@golemio/schema-definitions";
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
            data = this.replaceKeysInObj(element.body, "$", "_$"); // replacing `$` to `_$` for saving to db
        }

        const res = {
            data,
            headers: element.headers,
            updated_at: new Date().getTime(),
        };

        return res;
    }

    private replaceKeysInObj = (obj: object, oldKey: string|number, newKey: string|number) => {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                if (key === oldKey) {
                    obj[newKey] = value;
                    delete obj[key];
                }
                if (typeof value === "object" && key !== oldKey) {
                    obj[key] = this.replaceKeysInObj(value, oldKey, newKey);
                }
            }
        }
        return obj;
    }
}
