"use strict";

import { Gardens } from "golemio-schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class GardensTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = Gardens.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            geometry: {
                coordinates: element.coordinates,
                type: "Point",
            },
            properties: {
                address: (element.address) ? element.address : null,
                description: (element.description) ? element.description : null,
                district: (element.district) ? element.district : null,
                id: element.slug,
                image: (element.image) ? element.image : null,
                name: element.name,
                properties: [],
                timestamp: new Date().getTime(),
                url: (element.url) ? element.url : null,
            },
            type: "Feature",
        };

        res.properties.properties = Object.getOwnPropertyNames(element).map(
            (item) => (item.indexOf("properties_") !== -1 && element[item] && element[item] !== "")
                ? { id: item.replace("properties_", ""), description: element[item] }
                : null,
        ).filter((item) => item);

        return res;
    }

}
