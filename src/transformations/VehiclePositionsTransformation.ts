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

            // creating startDate and timestamp from zast[0].prij and cpoz
            const startDate = new Date();
            let startDatePlain = stops[0].$.prij || stops[0].$.odj;
            startDatePlain = startDatePlain.split(":");
            startDate.setHours(parseInt(startDatePlain[0], 10));
            startDate.setMinutes(parseInt(startDatePlain[1], 10));
            startDate.setSeconds(0);
            startDate.setMilliseconds(0);
            const timestamp = new Date();
            const timestampPlain = attributes.cpoz.split(":");
            timestamp.setHours(parseInt(timestampPlain[0], 10));
            timestamp.setMinutes(parseInt(timestampPlain[1], 10));
            timestamp.setSeconds(parseInt(timestampPlain[2], 10));
            timestamp.setMilliseconds(0);

            // check if vehicle has arrivals to stops over midnight
            if (startDate.getHours() - timestamp.getHours() > 12) {
                timestamp.setDate(timestamp.getDate() + 1);
            }

            const res = {
                stops: [],
                trip: {
                    delay_stop_arrival: parseInt(attributes.zpoz_prij, 10),
                    delay_stop_departure: parseInt(attributes.zpoz_odj, 10),
                    is_canceled: (attributes.zrus === "true") ? true : false,
                    is_low_floor: (attributes.np === "true") ? true : false,
                    last_stop_id_cis: parseInt(attributes.zast, 10),
                    lat: parseFloat(attributes.lat),
                    line: parseInt(attributes.lin, 10),
                    lng: parseFloat(attributes.lng),
                    route_id_cis: parseInt(attributes.spoj, 10),
                    route_number: parseInt(attributes.po, 10),
                    route_short_name: attributes.alias,
                    start_date: startDate.toUTCString(),
                    timestamp: timestamp.toUTCString(),
                    tracking: parseInt(attributes.sled, 10),
                    type: parseInt(attributes.t, 10),
                },
            };

            // collection JS Closure
            const stopsIterator = async (i, cb) => {
                if (stops.length === i) {
                    return cb();
                }
                let arrival;
                let departure;

                // creating arival from stops[i].$.prij
                if (stops[i].$.prij !== "") {
                    arrival = new Date();
                    const arrivalPlain = stops[i].$.prij.split(":");
                    arrival.setHours(parseInt(arrivalPlain[0], 10));
                    arrival.setMinutes(parseInt(arrivalPlain[1], 10));
                    arrival.setSeconds(0);
                    arrival.setMilliseconds(0);
                    // check if vehicle has arrivals to stops over midnight
                    if (startDate.getHours() - arrival.getHours() > 12) {
                        arrival.setDate(arrival.getDate() + 1);
                    }
                }
                // creating departure from stops[i].$.odj
                if (stops[i].$.odj !== "") {
                    departure = new Date();
                    const departurePlain = stops[i].$.odj.split(":");
                    departure.setHours(parseInt(departurePlain[0], 10));
                    departure.setMinutes(parseInt(departurePlain[1], 10));
                    departure.setSeconds(0);
                    departure.setMilliseconds(0);
                    // check if vehicle has arrivals to stops over midnight
                    if (startDate.getHours() - departure.getHours() > 12) {
                        departure.setDate(departure.getDate() + 1);
                    }
                }

                res.stops.push({
                    connection: parseInt(attributes.spoj, 10),
                    delay_arrival: parseInt(stops[i].$.zpoz_prij, 10),
                    delay_departure: parseInt(stops[i].$.zpoz_odj, 10),
                    delay_type: parseInt(stops[i].$.zpoz_typ, 10),
                    line: parseInt(attributes.lin, 10),
                    stop_id_cis: parseInt(stops[i].$.zast, 10),
                    stop_order: i,
                    stop_platform: stops[i].$.stan,
                    time_arrival: (arrival) ? arrival.toUTCString() : null,
                    time_departure: (departure) ? departure.toUTCString() : null,
                    timestamp: timestamp.toUTCString(),
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
