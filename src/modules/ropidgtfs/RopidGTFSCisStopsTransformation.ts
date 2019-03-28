"use strict";

import { RopidGTFS } from "data-platform-schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class RopidGTFSCisStopsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = RopidGTFS.name + "CisStops";
    }

    /**
     * Overrides BaseTransformation::transform
     */
    public transform = async (data: any|any[]): Promise<any|any[]> => {
        const res = {
            cis_stop_groups: [],
            cis_stops: [],
        };

        const promises = data.map(async (stopGroup) => {
            const promisesStops = stopGroup.stops.map((stop) => {
                return {
                    altIdosName: stop.altIdosName,
                    cis: stopGroup.cis,
                    id: stop.id,
                    jtskX: stop.jtskX,
                    jtskY: stop.jtskY,
                    lat: stop.lat,
                    lon: stop.lon,
                    platform: stop.platform,
                    wheelchairAccess: stop.wheelchairAccess,
                    zone: stop.zone,
                };
            });
            res.cis_stops.push(...await Promise.all(promisesStops));
            return {
                avgJtskX: stopGroup.avgJtskX,
                avgJtskY: stopGroup.avgJtskY,
                avgLat: stopGroup.avgLat,
                avgLon: stopGroup.avgLon,
                cis: stopGroup.cis,
                districtCode: stopGroup.districtCode,
                fullName: stopGroup.fullName,
                idosCategory: stopGroup.idosCategory,
                idosName: stopGroup.idosName,
                municipality: stopGroup.municipality,
                name: stopGroup.name,
                node: stopGroup.node,
                uniqueName: stopGroup.uniqueName,
            };
        });
        res.cis_stop_groups = await Promise.all(promises);
        return res;
    }

    protected transformElement = async (element: any): Promise<any> => {
        // Nothing to do.
        return;
    }

}
