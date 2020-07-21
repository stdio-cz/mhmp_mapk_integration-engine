"use strict";

import { SortedWasteStations } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class SensorContainersTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = SortedWasteStations.sensorsContainers.name;
    }

    protected transformElement = async (element: any): Promise<any> => {

        // console.error(element)
        // const res = {
        //     ...element,
        //     pick_at_utc: new Date(element.pick_at_utc).getTime(),
        //     updated_at: new Date().getTime(),
        // };
        // delete res.pick_at;

        return element;
    }

}
