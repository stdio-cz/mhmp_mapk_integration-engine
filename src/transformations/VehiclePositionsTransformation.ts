"use strict";

import BaseTransformation from "./BaseTransformation";
import ITransformation from "./ITransformation";

const moment = require("moment-timezone");

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

        // const now = new Date(moment.tz("Europe/Prague").format());
        const now = moment.tz("Europe/Prague");
        let isOverMidnight = 0;

        // creating startDate and timestamp from zast[0].prij and cpoz
        const startDate = moment.tz("Europe/Prague");
        let startDatePlain = (stops[0].$.prij !== "") ? stops[0].$.prij : stops[0].$.odj;
        startDatePlain = startDatePlain.split(":");
        startDate.hour(parseInt(startDatePlain[0], 10));
        startDate.minute(parseInt(startDatePlain[1], 10));
        startDate.second(0);
        startDate.millisecond(0);

        // midnight checking
        isOverMidnight = this.checkMidnight(now, startDate); // returns -1, 1 or 0
        // startDate.setDate(startDate.getDate() + isOverMidnight);
        startDate.add(isOverMidnight, "d");

        const timestamp = moment.tz("Europe/Prague");
        const timestampPlain = attributes.cpoz.split(":");
        timestamp.hour(parseInt(timestampPlain[0], 10));
        timestamp.minute(parseInt(timestampPlain[1], 10));
        timestamp.second(parseInt(timestampPlain[2], 10));
        timestamp.millisecond(0);

        // midnight checking
        isOverMidnight = this.checkMidnight(now, timestamp); // returns -1, 1 or 0
        // timestamp.setDate(timestamp.getDate() + isOverMidnight);
        timestamp.add(isOverMidnight, "d");

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
                start_date: startDate.utc().format(),
                timestamp: timestamp.utc().format(),
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
                arrival = moment.tz("Europe/Prague");
                const arrivalPlain = stop.$.prij.split(":");
                arrival.hour(parseInt(arrivalPlain[0], 10));
                arrival.minute(parseInt(arrivalPlain[1], 10));
                arrival.second(0);
                arrival.millisecond(0);

                // midnight checking
                isOverMidnight = this.checkMidnight(now, arrival); // returns -1, 1 or 0
                // arrival.setDate(arrival.getDate() + isOverMidnight);
                arrival.add(isOverMidnight, "d");
            }
            // creating departure from stop.$.odj
            if (stop.$.odj !== "") {
                departure = moment.tz("Europe/Prague");
                const departurePlain = stop.$.odj.split(":");
                departure.hour(parseInt(departurePlain[0], 10));
                departure.minute(parseInt(departurePlain[1], 10));
                departure.second(0);
                departure.millisecond(0);

                // midnight checking
                isOverMidnight = this.checkMidnight(now, departure); // returns -1, 1 or 0
                // departure.setDate(departure.getDate() + isOverMidnight);
                departure.add(isOverMidnight, "d");
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
                time_arrival: (arrival) ? arrival.utc().format() : null,
                time_departure: (departure) ? departure.utc().format() : null,
                timestamp: timestamp.utc().format(),
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

    private checkMidnight = (now, start): number => {
        if (now.hour() - start.hour() <= -(24 - 12)) { // "backwards" 12 hours
            return -1;
        } else if (now.hour() - start.hour() >= (24 - 6)) { // "forwards" 6 hours
            return 1;
        }
        return 0; // same day
    }

}
