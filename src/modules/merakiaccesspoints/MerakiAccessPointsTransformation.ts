"use strict";

import { MerakiAccessPoints } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class MerakiAccessPointsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = MerakiAccessPoints.name;
    }

    /**
     * Overrides BaseTransformation::transform
     */
    public transform = async (data: any|any[]): Promise<any|any[]> => {
        const res = {
            observations: [],
            tags: [],
        };

        const tagsPromises = data.data.apTags.map(async (tag) => {
            if (tag !== "") {
                res.tags.push({
                    ap_mac: data.data.apMac,
                    tag,
                });
            }
        });

        const obsPromises = data.data.observations.map(async (observation) => {
            res.observations.push({
                ap_mac: data.data.apMac,
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
                type: data.type,
                unc: (observation.location && observation.location.unc)
                    ? observation.location.unc
                    : null,
            });
        });

        await Promise.all(tagsPromises);
        await Promise.all(obsPromises);
        return res;
    }

    protected transformElement = async (element: any): Promise<any> => {
        // Nothing to do.
        return;
    }

}
