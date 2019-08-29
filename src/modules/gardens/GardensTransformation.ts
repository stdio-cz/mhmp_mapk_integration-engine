"use strict";

import { Gardens } from "@golemio/schema-definitions";
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
                address: (element.address)
                    ? { address_formatted: element.address }
                    : null,
                description: (element.description) ? element.description : null,
                district: (element.district) ? element.district : null,
                id: element.slug,
                image: {
                    url: (element.image) ? element.image : null,
                },
                name: element.name,
                properties: [],
                updated_at: new Date().getTime(),
                url: (element.url) ? element.url : null,
            },
            type: "Feature",
        };

        res.properties.properties = Object.getOwnPropertyNames(element).map((item) => {
            if ((item.indexOf("properties_") !== -1 && element[item] && element[item] !== "")) {
                const propertyId = item.replace("properties_", "");
                return {
                    description: this.getPropertyDescription(propertyId),
                    id: propertyId,
                    value: element[item],
                };
            }
            return null;
        }).filter((item) => item);

        return res;
    }

    private getPropertyDescription = (id: string): string => {
        switch (id) {
            case "restaurace": return "Občerstvení";
            case "wc": return "WC";
            case "misto": return "Zajímavosti";
            case "kolo": return "Cyklostezky";
            case "hriste": return "Dětské hřiště";
            case "brusle": return "Bruslení";
            case "sport": return "Sportovní hřiště";
            case "mhd": return "MHD";
            case "parking": return "Parkování";
            case "cesty": return "Povrch cest";
            case "provoz": return "Provozovatel";
            case "doba": return "Otevírací doba";
            default: return null;
        }
    }

}
