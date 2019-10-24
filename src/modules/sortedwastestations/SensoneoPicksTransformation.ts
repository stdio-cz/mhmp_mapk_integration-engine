"use strict";

import { SortedWasteStations } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class SensoneoPicksTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = SortedWasteStations.sensorsPicks.name;
    }

    protected transformElement = async (element: any): Promise<any> => {

        const res = { ...element, updated_at: new Date().getTime() };
        delete res.picked_at;

        return res;
    }

}
