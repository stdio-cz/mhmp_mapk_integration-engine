"use strict";

import { Parkings } from "data-platform-schema-definitions";
import BaseTransformation from "./BaseTransformation";
import ITransformation from "./ITransformation";

export default class ParkingsTransformation extends BaseTransformation implements ITransformation {

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
                timestamp: !isNaN(parseInt(element.lastUpdated, 10))
                    ? element.lastUpdated
                    : null,
                total_num_of_places: !isNaN(parseInt(element.totalNumOfPlaces, 10))
                    ? parseInt(element.totalNumOfPlaces, 10)
                    : null,
            },
            type: "Feature",
        };
        return res;
    }

    protected transformHistoryElement = async (element: any): Promise<any> => {
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
