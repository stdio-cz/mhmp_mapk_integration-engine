"use strict";

import { TrafficCameras } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

import request from "request-promise";

export class TrafficCamerasTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = TrafficCameras.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            geometry: {
                coordinates: [ parseFloat(element.lng), parseFloat(element.lat) ],
                type: "Point",
            },
            properties: {
                id: element.id,
                image: {
                    data: null,
                    file_size: !isNaN(parseInt(element.imgFileSize, 10))
                        ? parseInt(element.imgFileSize, 10)
                        : null,
                    type: null,
                    url: "http://www.tsk-praha.cz/cams/cam" + element.id + ".jpg",
                },
                last_updated: !isNaN(parseInt(element.lastUpdated, 10))
                    ? parseInt(element.lastUpdated, 10)
                    : null,
                name: element.name,
                updated_at: new Date().getTime(),
            },
            type: "Feature",
        };

        if (res.properties.last_updated) {
            res.properties.image.url += "?" + res.properties.last_updated;
        }

        const response = await request({
            encoding: null,
            method: "GET",
            resolveWithFullResponse: true,
            url: res.properties.image.url,
        });
        const contentLength = parseInt(response.headers["content-length"], 10);
        const noImageCode = "ooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiuu1Dwdp2j+"
            + "FbfU9Q8SWv8AadyN0Wl2iCdwO3mOHAT36n6nIAByNFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUU"
            + "UUAFFFFABRRRQAUUUUAFd/8GtI0/XPiLa2OqWcV3atBKzRSrlSQuRxXAV6Z8Bf+SqWf/XvN/wCgGgDr7T4baJ";
        const imageData = new Buffer(response.body).toString("base64");
        if (contentLength === 0 || (contentLength === 13439 && imageData.indexOf(noImageCode, 833) !== -1)) {
            res.properties.image.type = null;
            res.properties.image.data = null;
        } else {
            res.properties.image.type = response.headers["content-type"];
            res.properties.image.data = "data:" + response.headers["content-type"] + ";base64,"
                + imageData;
        }
        return res;
    }

    protected transformHistoryElement = async (element: any): Promise<any> => {
        const res = {
            id: element.properties.id,
            image: element.properties.image,
            last_updated: element.properties.last_updated,
            updated_at: new Date().getTime(),
        };
        return res;
    }

}
