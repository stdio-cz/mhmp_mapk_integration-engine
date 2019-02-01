"use strict";

import { RopidGTFS } from "data-platform-schema-definitions";
import BaseTransformation from "./BaseTransformation";
import ITransformation from "./ITransformation";

export default class RopidGTFSCisStopsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = "RopidGTFSCisStops"; // RopidGTFS.name;
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
            cis_stop_groups: [],
            cis_stops: [],
        };

        collection.map((stopGroup) => {
            res.cis_stop_groups.push({
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
            });
            stopGroup.stops.map((stop) => {
                res.cis_stops.push({
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
                });
            });
        });
        return res;
    }

}
