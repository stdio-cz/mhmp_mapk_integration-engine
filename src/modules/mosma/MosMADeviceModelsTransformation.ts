"use strict";

import { MOS } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class MosMADeviceModelsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = MOS.MA.deviceModels.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            count: element.count,
            model: element.model,
        };
        return res;
    }

}
