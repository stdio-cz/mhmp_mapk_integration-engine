"use strict";

import { Parkings } from "@golemio/schema-definitions";
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
                payment_link: `${config.PARKINGS_PAYMENT_URL}?shortname=${this.getMPLAPaymentShortName(element.id)}`,
                payment_shortname: this.getMPLAPaymentShortName(element.id),
                total_num_of_places: !isNaN(parseInt(element.totalNumOfPlaces, 10))
                    ? parseInt(element.totalNumOfPlaces, 10)
                    : null,
                updated_at: new Date().getTime(),
            },
            type: "Feature",
        };
        if (!res.properties.payment_shortname) {
            delete res.properties.payment_link;
            delete res.properties.payment_shortname;
        }

        return res;
    }

    protected transformHistoryElement = async (element: any): Promise<any> => {
        const res = {
            id: element.properties.id,
            last_updated: element.properties.last_updated,
            num_of_free_places: element.properties.num_of_free_places,
            num_of_taken_places: element.properties.num_of_taken_places,
            total_num_of_places: element.properties.total_num_of_places,
            updated_at: new Date().getTime(),
        };
        if (!res.total_num_of_places) { // null || undefined || 0
            return null;
        }
        return res;
    }

    private getMPLAPaymentShortName = (id: number): string | null => {
        switch (id) {
            case 534002: return "139"; // Holešovice
            case 534004: return "142"; // Rajska Zahrada
            case 534007: return "141"; // Radotín
            case 534008: return "144"; // Zličín 1
            case 534009: return "145"; // Zličín 2
            case 534010: return "143"; // Skalka 2
            case 534011: return "147"; // Černý most
            case 534012: return "143"; // Skalka 1
            case 534014: return "121"; // Ládví
            case 534015: return "122"; // Depo Hostivař
            case 534016: return "123"; // Letňany
            case 534017: return "106"; // Westfield Chodov
            case 5340171: return "106"; // Chodov A
            case 5340172: return "106"; // Chodov E
            default: return null;
        }
    }

}
