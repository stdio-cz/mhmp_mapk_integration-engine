"use strict";

import BaseTransformation from "./BaseTransformation";
import ITransformation from "./ITransformation";

export default class VehiclePositionsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = "VehiclePositions";
    }

    /**
     * Transforms data from data source to output format (JSON)
     */
    public TransformDataElement = async (element): Promise<any> => {
        return new Promise((resolve, reject) => {
            const attributes = element.$;
            const stops = element.zast;

            const res = {
                stops: [],
                trip: {
                    line: attributes.lin,
                    route_short_name: attributes.alias,
                    route_id_cis: attributes.spoj,
                    route_number: attributes.po,
                    is_low_floor: attributes.np,
                    type: attributes.t,
                    is_canceled: attributes.zrus,
                    lat: attributes.lat,
                    lng: attributes.lng,
                    timestamp: attributes.cpoz,
                    // Převod na timestamp (pozor, čas 23:59 který přišel v 0:01 bude mít včerejší datum!)
                    po: attributes.po,
                    last_stop_id_cis: attributes.zast,
                    delay_stop_arrival: attributes.zpoz_prij,
                    delay_stop_departure: attributes.zpoz_odj,

                    // TODO
                    created: null, // Metadata - čas vytvoření záznamu
                    trip_id: null, // prázdné, bude dohledáno workerem
                    last_modify: null, // Metadata - čas poslední úpravy
                },
            };

            // collection JS Closure
            const stopsIterator = async (i, cb) => {
                if (stops.length === i) {
                    return cb();
                }
                res.stops.push({
                    stop_id_cis: stops[i].$.zast,
                    stop_platform: stops[i].$.stan,
                    time_arrival: stops[i].$.prij,
                    // ^- Převod na timestamp (pozor, čas 23:59 který přišel v 0:01 bude mít včerejší datum!)
                    time_departure: stops[i].$.odj,
                    // ^- Převod na timestamp (pozor, čas 23:59 který přišel v 0:01 bude mít včerejší datum!)
                    delay_type: stops[i].$.zpoz_typ,
                    delay_arrival: stops[i].$.zpoz_prij,
                    delay_departure: stops[i].$.zpoz_odj,
                    line: attributes.lin,
                    connection: attributes.spoj,

                    // TODO
                    created: null, // Metadata - čas vytvoření záznamu
                });
                setImmediate(stopsIterator.bind(null, i + 1, cb));
            };
            stopsIterator(0, () => {
                resolve(res);
            });
        });
    }

    /**
     * Transforms data from data source to output format (JSON)
     */
    public TransformDataCollection = (collection): Promise<any> => {
        return new Promise((resolve, reject) => {
            const res = {
                stops: [],
                trips: [],
            };
            // collection JS Closure
            const collectionIterator = async (i, cb) => {
                if (collection.length === i) {
                    cb();
                    return;
                }
                const element = await this.TransformDataElement(collection[i]);
                res.stops = res.stops.concat(element.stops);
                res.trips.push(element.trip);
                setImmediate(collectionIterator.bind(null, i + 1, cb));
            };
            collectionIterator(0, () => {
                resolve(res);
            });
        });
    }

}
