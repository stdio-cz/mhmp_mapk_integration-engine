"use strict";

import GeoJsonTransformation from "./GeoJsonTransformation";
import ITransformation from "./ITransformation";

export default class ParkingsTransformation extends GeoJsonTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = "Parkings";
    }

    /**
     * Transforms data from data source to output format (geoJSON Feature)
     */
    public TransformDataElement = async (element): Promise<any> => {
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

}
