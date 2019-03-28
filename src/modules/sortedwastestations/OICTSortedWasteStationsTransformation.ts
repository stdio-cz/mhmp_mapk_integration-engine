"use strict";

import { SortedWasteStations } from "data-platform-schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class OICTSortedWasteStationsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = SortedWasteStations.oict.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            geometry: {
                coordinates: element.coordinates,
                type: "Point",
            },
            properties: {
                accessibility: this.getAccessibilityByString(element.accessibility),
                containers: [{
                    cleaning_frequency: (element.cleaning_frequency === "0" || element.cleaning_frequency === "00")
                        ? null
                        : element.cleaning_frequency,
                    company: element.company,
                    container_type: null,
                    description: (element.description) ? element.description : null,
                    trash_type: this.getTrashTypeByString(element.trash_type),
                }],
                district: element.district,
                id: element.unique_id,
                name: element.address,
                station_number: null,
                timestamp: new Date().getTime(),
            },
            type: "Feature",
        };
        return res;
    }

    private getAccessibilityByString = (key: string): {id: number, description: string} => {
        switch (key) {
            case "volně":
                return { description: "volně", id: 1 };
            case "obyvatelům domu":
                return { description: "obyvatelům domu", id: 2 };
            default:
                return { description: "neznámá", id: 0 };
        }
    }

    private getTrashTypeByString = (key: string): {id: number, description: string} => {
        switch (key) {
            case "Barevné sklo":
                return { description: "Barevné sklo", id: 1 };
            case "Elektrozařízení":
                return { description: "Elektrozařízení", id: 2 };
            case "Kovy":
                return { description: "Kovy", id: 3 };
            case "Nápojové kartóny":
                return { description: "Nápojové kartóny", id: 4 };
            case "Papír":
                return { description: "Papír", id: 5 };
            case "Plast":
                return { description: "Plast", id: 6 };
            case "Čiré sklo":
                return { description: "Čiré sklo", id: 7 };
            case "Textil":
                return { description: "Textil", id: 8 };
            default:
                return { description: "neznámý", id: 0 };
        }
    }
}
