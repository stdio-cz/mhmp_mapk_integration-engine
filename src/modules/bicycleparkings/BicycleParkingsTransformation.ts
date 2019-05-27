"use strict";

import { BicycleParkings } from "golemio-schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class BicycleParkingsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = BicycleParkings.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            geometry: {
                coordinates: [ element.lon, element.lat ],
                type: "Point",
            },
            properties: {
                id: element.id,
                tags: [],
                updated_at: new Date().getTime(),
            },
            type: "Feature",
        };

        res.properties.tags = Object.keys(element.tags)
            .filter((tagid) => tagid !== "amenity")
            .map((tagid) => Object.assign({ id: tagid, value: element.tags[tagid] }));

        return res;
    }

}
