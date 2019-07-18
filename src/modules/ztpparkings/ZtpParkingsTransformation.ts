"use strict";

const moment = require("moment");

import { ZtpParkings } from "golemio-schema-definitions";
import { config } from "../../core/config";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class ZtpParkingsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = ZtpParkings.name;
    }

    protected transformElement = async (data: any): Promise<any> => {
        const res: any[] = [];
        if (data) {
            Object.keys(data).forEach((key) => {
                const innerArray: any[] = data[key];
                if (innerArray) {
                    innerArray.forEach(((element) => {
                        const lastUpdated = moment.tz(element.last_updated, "Europe/Prague");
                        const lastUpdatedAsNumber = lastUpdated.valueOf();

                        const status = parseInt(element.status, 10);
                        const item = {
                            geometry: {
                                coordinates: [parseFloat(element.lng), parseFloat(element.lat)],
                                type: "Point",
                            },
                            properties: {
                                active: element.active,
                                // address: null,
                                device_id: element.device,
                                // district: null,
                                failure: status === 2,
                                group: element.group,
                                id: element.id,
                                id_group: key,
                                id_park: element.id_park,
                                id_space: element.id_space,
                                image_name: element.image,
                                image_src: element.image_src,
                                last_updated_at: lastUpdatedAsNumber,
                                location: element.lokalita,
                                master: element.master,
                                note: element.note,
                                occupied: status === 0 ? false : status === 1 ? true : null,
                                signal_rssi0: element.rssi0,
                                signal_rssi1: element.rssi1,
                                size: element.rozmer,
                                source: element.source,
                                surface: element.povrch,
                                temperature: element.temperature,
                                type: element.typ,
                                updated_at: new Date().getTime(),
                            },
                            type: "Feature",
                        };

                        res.push(item);
                    }));
                }
            });
        }

        return res;
    }

    protected transformHistoryElement = async (element: any): Promise<any> => {
        const res = {
            failure: element.properties.failure,
            id: element.properties.id,
            last_updated_at: element.properties.last_updated_at,
            occupied: element.properties.occupied,
            updated_at: new Date().getTime(),
        };

        return res;
    }
}
