"use strict";

import { SortedWasteStations } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

const slug = require("slugify");

export class POTEXSortedWasteStationsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = SortedWasteStations.potex.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            geometry: {
                coordinates: [ parseFloat(element.lng), parseFloat(element.lat) ],
                type: "Point",
            },
            properties: {
                accessibility: { description: "volně", id: 1 },
                containers: [{
                    cleaning_frequency: null,
                    company: {
                        email: "potex@potex.cz",
                        name: "POTEX s.r.o.",
                        phone: "+420 739 495 757",
                        web: "http://www.recyklujemetextil.cz",
                    },
                    container_type: null,
                    description: (element.address) ? element.address : null,
                    trash_type: { description: "Textil", id: 8 },
                }],
                id: "potex-" + slug(element.title, { lower: true }),
                name: element.title,
                station_number: null,
                updated_at: new Date().getTime(),
            },
            type: "Feature",
        };
        return res;
    }

}
