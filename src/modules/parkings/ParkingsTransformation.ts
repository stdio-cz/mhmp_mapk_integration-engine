"use strict";

import { Parkings } from "golemio-schema-definitions";
import { config } from "../../core/config";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class ParkingsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = Parkings.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            geometry: {
                coordinates: [ parseFloat(element.lng), parseFloat(element.lat) ],
                type: "Point",
            },
            properties: {
                id: element.id,
                last_updated: !isNaN(parseInt(element.lastUpdated, 10))
                    ? parseInt(element.lastUpdated, 10)
                    : null,
                name: element.name,
                num_of_free_places: !isNaN(parseInt(element.numOfFreePlaces, 10))
                    ? parseInt(element.numOfFreePlaces, 10)
                    : null,
                num_of_taken_places: !isNaN(parseInt(element.numOfTakenPlaces, 10))
                    ? parseInt(element.numOfTakenPlaces, 10)
                    : null,
                parking_type: (element.pr)
                    ? { description: "P+R parkoviště", id: 1 }
                    : { description: "placené parkoviště", id: 2 },
                payment_link: this.getMPLAPaymentLink(element.id),
                timestamp: new Date().getTime(),
                total_num_of_places: !isNaN(parseInt(element.totalNumOfPlaces, 10))
                    ? parseInt(element.totalNumOfPlaces, 10)
                    : null,
            },
            type: "Feature",
        };
        if (!res.properties.payment_link) {
            delete res.properties.payment_link;
        }

        return res;
    }

    protected transformHistoryElement = async (element: any): Promise<any> => {
        const res = {
            id: element.properties.id,
            last_updated: element.properties.last_updated,
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

    private getMPLAPaymentLink = (id: number): string => {
        const link = config.PARKINGS_PAYMENT_URL + "?shortname=";
        switch (id) {
            case 5340171: return link + "106"; // Chodov A
            case 5340172: return link + "106"; // Chodov E
            case 534015: return link + "122"; // Depo Hostivař
            case 534014: return link + "121"; // Ládví
            case 534016: return link + "123"; // Letňany
            default: return null;
        }
    }

}
