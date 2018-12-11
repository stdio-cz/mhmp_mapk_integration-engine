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
        const attributes = element.$;
        const stops = element.zast;

        if (!attributes.cpoz) {
            return null;
        }

        const now = new Date();

        // creating startDate and timestamp from zast[0].prij and cpoz
        const startDate = new Date();
        let startDatePlain = (stops[0].$.prij !== "") ? stops[0].$.prij : stops[0].$.odj;
        startDatePlain = startDatePlain.split(":");
        startDate.setHours(parseInt(startDatePlain[0], 10));
        startDate.setMinutes(parseInt(startDatePlain[1], 10));
        startDate.setSeconds(0);
        startDate.setMilliseconds(0);
        if (now.getHours() - startDate.getHours() < 0) {
            startDate.setDate(startDate.getDate() - 1);
        }

        const timestamp = new Date();
        const timestampPlain = attributes.cpoz.split(":");
        timestamp.setHours(parseInt(timestampPlain[0], 10));
        timestamp.setMinutes(parseInt(timestampPlain[1], 10));
        timestamp.setSeconds(parseInt(timestampPlain[2], 10));
        timestamp.setMilliseconds(0);
        if (now.getHours() - timestamp.getHours() < 0) {
            timestamp.setDate(timestamp.getDate() - 1);
        }

        const res = {
            stops: [],
            trip: {
                delay_stop_arrival: (attributes.zpoz_prij)
                    ? parseInt(attributes.zpoz_prij, 10)
                    : null,
                delay_stop_departure: (attributes.zpoz_odj)
                    ? parseInt(attributes.zpoz_odj, 10)
                    : null,
                is_canceled: (attributes.zrus === "true") ? true : false,
                is_low_floor: (attributes.np === "true") ? true : false,
                last_stop_id_cis: (attributes.zast)
                    ? parseInt(attributes.zast, 10)
                    : null,
                lat: (attributes.lat)
                    ? parseFloat(attributes.lat)
                    : null,
                line: parseInt(attributes.lin, 10),
                lng: (attributes.lng)
                    ? parseFloat(attributes.lng)
                    : null,
                route_id_cis: parseInt(attributes.spoj, 10),
                route_number: parseInt(attributes.po, 10),
                route_short_name: attributes.alias,
                start_date: startDate.toUTCString(),
                timestamp: timestamp.toUTCString(),
                tracking: (attributes.sled)
                    ? parseInt(attributes.sled, 10)
                    : null,
                type: (attributes.t)
                    ? parseInt(attributes.t, 10)
                    : null,
            },
        };

        const promises = stops.map((stop, i) => {
            let arrival;
            let departure;

            // creating arival from stop.$.prij
            if (stop.$.prij !== "") {
                arrival = new Date();
                const arrivalPlain = stop.$.prij.split(":");
                arrival.setHours(parseInt(arrivalPlain[0], 10));
                arrival.setMinutes(parseInt(arrivalPlain[1], 10));
                arrival.setSeconds(0);
                arrival.setMilliseconds(0);
                // check if vehicle has arrivals to stops over midnight
                if (now.getHours() - arrival.getHours() < 0) {
                    arrival.setDate(arrival.getDate() - 1);
                }
            }
            // creating departure from stop.$.odj
            if (stop.$.odj !== "") {
                departure = new Date();
                const departurePlain = stop.$.odj.split(":");
                departure.setHours(parseInt(departurePlain[0], 10));
                departure.setMinutes(parseInt(departurePlain[1], 10));
                departure.setSeconds(0);
                departure.setMilliseconds(0);
                // check if vehicle has arrivals to stops over midnight
                if (now.getHours() - departure.getHours() < 0) {
                    departure.setDate(departure.getDate() - 1);
                }
            }

            res.stops.push({
                connection: parseInt(attributes.spoj, 10),
                delay_arrival: (stop.$.zpoz_prij)
                    ? parseInt(stop.$.zpoz_prij, 10)
                    : null,
                delay_departure: (stop.$.zpoz_odj)
                    ? parseInt(stop.$.zpoz_odj, 10)
                    : null,
                delay_type: (stop.$.zpoz_typ)
                    ? parseInt(stop.$.zpoz_typ, 10)
                    : null,
                line: parseInt(attributes.lin, 10),
                stop_id_cis: parseInt(stop.$.zast, 10),
                stop_order: i,
                stop_platform: stop.$.stan,
                time_arrival: (arrival) ? arrival.toUTCString() : null,
                time_departure: (departure) ? departure.toUTCString() : null,
                timestamp: timestamp.toUTCString(),
            });
        });

        await Promise.all(promises);
        return res;
    }

    /**
     * Transforms data from data source to output format (JSON)
     */
    public TransformDataCollection = async (collection): Promise<any> => {
        const res = {
            stops: [],
            trips: [],
        };

        if (collection instanceof Array) {
            const promises = collection.map(async (element, i) => {
                const elemRes = await this.TransformDataElement(element);
                if (elemRes) {
                    res.stops = res.stops.concat(elemRes.stops);
                    res.trips.push(elemRes.trip);
                }
                return;
            });
            await Promise.all(promises);
            return res;
        } else {
            const elemRes = await this.TransformDataElement(collection);
            if (elemRes) {
                res.stops = res.stops.concat(elemRes.stops);
                res.trips.push(elemRes.trip);
            }
            return res;
        }
    }

}
