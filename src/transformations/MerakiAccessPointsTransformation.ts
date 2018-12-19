"use strict";

import { MerakiAccessPoints } from "data-platform-schema-definitions";
import BaseTransformation from "./BaseTransformation";
import ITransformation from "./ITransformation";

export default class MerakiAccessPointsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = MerakiAccessPoints.name;
    }

    /**
     * Transforms data from data source to output format (JSON)
     */
    public TransformDataElement = async (element): Promise<any> => {
        // not used
    }

    /**
     * Transforms data from data source to output format (JSON)
     */
    public TransformDataCollection = async (collection): Promise<any> => {
        const res = {
            observations: [],
            tags: [],
        };

        const tagsPromises = collection.data.apTags.map((tag) => {
            if (tag !== "") {
                res.tags.push({
                    ap_mac: collection.data.apMac,
                    tag,
                });
            }
        });

        const obsPromises = collection.data.observations.map((observation) => {
            res.observations.push({
                ap_mac: collection.data.apMac,
                client_mac: observation.clientMac,
                ipv4: (observation.ipv4) ? observation.ipv4 : null,
                ipv6: (observation.ipv6) ? observation.ipv6 : null,
                lat: (observation.location && observation.location.lat)
                    ? observation.location.lat
                    : null,
                lng: (observation.location && observation.location.lng)
                    ? observation.location.lng
                    : null,
                manufacturer: (observation.manufacturer) ? observation.manufacturer : null,
                os: (observation.os) ? observation.os : null,
                rssi: (observation.rssi) ? observation.rssi : null,
                ssid: (observation.ssid) ? observation.ssid : null,
                timestamp: new Date(observation.seenEpoch * 1000).toUTCString(),
                type: collection.type,
                unc: (observation.location && observation.location.unc)
                    ? observation.location.unc
                    : null,
            });
        });

        await Promise.all(tagsPromises);
        await Promise.all(obsPromises);
        return res;
    }

}
