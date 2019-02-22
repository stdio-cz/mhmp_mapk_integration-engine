"use strict";

import { Parkings } from "data-platform-schema-definitions";
import BaseTransformation from "./BaseTransformation";
import ITransformation from "./ITransformation";

export default class ParkingsHistoryTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = Parkings.history.name;
    }

    public transformElement = async (element: any): Promise<any> => {
        const res = {
            id: element.properties.id,
            num_of_free_places: element.properties.num_of_free_places,
            num_of_taken_places: element.properties.num_of_taken_places,
            timestamp: new Date().getTime(),
            total_num_of_places: element.properties.total_num_of_places,
        };
        if (!res.total_num_of_places) { // null || undefined || 0
            return null;
        }
        return res;
    }

}
