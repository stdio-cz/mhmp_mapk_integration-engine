"use strict";

import { Gardens } from "data-platform-schema-definitions";
import BaseTransformation from "./BaseTransformation";
import ITransformation from "./ITransformation";

export default class GardensTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = Gardens.name;
    }

    public transformElement = async (element: any): Promise<any> => {
        const res = {
            geometry: {
                coordinates: element.coordinates,
                type: "Point",
            },
            properties: {
                address: null,
                description: null,
                district: null,
                id: element.slug,
                image: null,
                name: element.name,
                properties: [],
                timestamp: new Date().getTime(),
                url: null,
            },
            type: "Feature",
        };
        if (element.image) {
            res.properties.image = element.image;
        }
        if (element.description) {
            res.properties.description = element.description;
        }
        if (element.url) {
            res.properties.url = element.url;
        }
        if (element.address) {
            res.properties.address = element.address;
        }
        if (element.district) {
            res.properties.district = element.district;
        }

        // TODO: will be moved elsewhere
        if (element.properties_restaurace) {
            res.properties.properties.push({ id: "restaurace", value: element.properties_restaurace });
        }
        if (element.properties_wc) {
            res.properties.properties.push({ id: "wc", value: element.properties_wc });
        }
        if (element.properties_misto) {
            res.properties.properties.push({ id: "misto", value: element.properties_misto });
        }
        if (element.properties_kolo) {
            res.properties.properties.push({ id: "kolo", value: element.properties_kolo });
        }
        if (element.properties_hriste) {
            res.properties.properties.push({ id: "hriste", value: element.properties_hriste });
        }
        if (element.properties_brusle) {
            res.properties.properties.push({ id: "brusle", value: element.properties_brusle });
        }
        if (element.properties_sport) {
            res.properties.properties.push({ id: "sport", value: element.properties_sport });
        }
        if (element.properties_mhd) {
            res.properties.properties.push({ id: "mhd", value: element.properties_mhd });
        }
        if (element.properties_parking) {
            res.properties.properties.push({ id: "parking", value: element.properties_parking });
        }
        if (element.properties_cesty) {
            res.properties.properties.push({ id: "cesty", value: element.properties_cesty });
        }
        if (element.properties_provoz) {
            res.properties.properties.push({ id: "provoz", value: element.properties_provoz });
        }
        if (element.properties_doba) {
            res.properties.properties.push({ id: "doba", value: element.properties_doba });
        }

        return res;
    }

}
