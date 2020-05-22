"use strict";

import { VehiclePositions } from "@golemio/schema-definitions";
import * as moment from "moment-timezone";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class VehiclePositionsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = VehiclePositions.name;
    }

    /**
     * Overrides BaseTransformation::transform
     */
    public transform = async (data: any | any[]): Promise<any | any[]> => {
        const res = {
            positions: [],
            stops: [],
            trips: [],
        };

        if (data instanceof Array) {
            const promises = data.map(async (element, i) => {
                const elemRes = await this.transformElement(element);
                if (elemRes) {
                    res.positions.push(elemRes.position);
                    res.stops = res.stops.concat(elemRes.stops);
                    res.trips.push(elemRes.trip);
                }
                return;
            });
            await Promise.all(promises);
            return res;
        } else {
            const elemRes = await this.transformElement(data);
            if (elemRes) {
                res.positions.push(elemRes.position);
                res.stops = res.stops.concat(elemRes.stops);
                res.trips.push(elemRes.trip);
            }
            return res;
        }
    }

    protected transformElement = async (element: any): Promise<any> => {
        const attributes = element.$;
        const stops = element.zast;

        if (!attributes.cpoz) {
            return null;
        }

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
        startDate.add(isOverMidnight, "d");

        const timestamp = moment.tz("Europe/Prague");
        const timestampPlain = attributes.cpoz.split(":");
        timestamp.hour(parseInt(timestampPlain[0], 10));
        timestamp.minute(parseInt(timestampPlain[1], 10));
        timestamp.second(parseInt(timestampPlain[2], 10));
        timestamp.millisecond(0);

        // midnight checking
        isOverMidnight = this.checkMidnight(now, timestamp); // returns -1, 1 or 0
        timestamp.add(isOverMidnight, "d");

        // primary key -> start_timestamp, cis_id, cis_short_name, cis_number
        const primaryKey = startDate.utc().format()
            + "_" + attributes.lin + "_" + attributes.alias + "_" + attributes.spoj;

        const res = {
            position: {
                bearing: (attributes.azimut)
                    ? this.fixSourceNegativeBearing(parseInt(attributes.azimut, 10))
                    : null,
                cis_last_stop_id: (attributes.zast)
                    ? parseInt(attributes.zast, 10)
                    : null,
                cis_last_stop_sequence: null,
                delay_stop_arrival: (attributes.zpoz_prij)
                    ? parseInt(attributes.zpoz_prij, 10)
                    : null,
                delay_stop_departure: (attributes.zpoz_odj)
                    ? parseInt(attributes.zpoz_odj, 10)
                    : null,
                is_canceled: (attributes.zrus === "true") ? true : false,
                lat: (attributes.lat)
                    ? parseFloat(attributes.lat)
                    : null,
                lng: (attributes.lng)
                    ? parseFloat(attributes.lng)
                    : null,
                origin_time: attributes.cpoz,
                origin_timestamp: timestamp.utc().valueOf(),
                speed: (attributes.rychl)
                    ? parseInt(attributes.rychl, 10)
                    : null,
                tracking: (attributes.sled)
                    ? parseInt(attributes.sled, 10)
                    : null,
                trips_id: primaryKey,
            },
            stops: [],
            trip: {
                agency_name_real: (attributes.doprSkut)
                    ? attributes.doprSkut
                    : null,
                agency_name_scheduled: (attributes.dopr)
                    ? attributes.dopr
                    : null,
                cis_line_id: parseInt(attributes.lin, 10),
                cis_line_short_name: attributes.alias,
                cis_trip_number: parseInt(attributes.spoj, 10),
                id: primaryKey,
                origin_route_name: (attributes.kmenl)
                    ? parseInt(attributes.kmenl, 10)
                    : null,
                sequence_id: parseInt(attributes.po, 10),
                start_cis_stop_id: parseInt(stops[0].$.zast, 10),
                start_cis_stop_platform_code: stops[0].$.stan,
                start_time: (stops[0].$.prij !== "") ? stops[0].$.prij : stops[0].$.odj,
                start_timestamp: startDate.utc().valueOf(),
                vehicle_registration_number: (attributes.vuzevc)
                    ? parseInt(attributes.vuzevc, 10)
                    : null,
                vehicle_type_id: (attributes.t)
                    ? parseInt(attributes.t, 10)
                    : null,
                wheelchair_accessible: (attributes.np === "true") ? true : false,
            },
        };

        const promises = stops.map(async (stop, i) => {
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
                departure.add(isOverMidnight, "d");
            }

            const cisStopSequence = i + 1;
            // finding cis_last_stop_sequence (positions table)
            if (res.position.cis_last_stop_id === parseInt(stop.$.zast, 10)
                && ((stop.$.zpoz_typ && parseInt(stop.$.zpoz_typ, 10) === 3)
                    || (stop.$.zpoz_typ_prij && parseInt(stop.$.zpoz_typ_prij, 10) === 3))) {
                res.position.cis_last_stop_sequence = cisStopSequence;
            }

            return {
                arrival_delay_type: (stop.$.zpoz_typ_prij)
                    ? parseInt(stop.$.zpoz_typ_prij, 10)
                    : null,
                arrival_time: (arrival) ? stop.$.prij : null,
                arrival_timestamp: (arrival) ? arrival.utc().valueOf() : null,
                cis_stop_id: parseInt(stop.$.zast, 10),
                cis_stop_platform_code: stop.$.stan,
                cis_stop_sequence: cisStopSequence,
                delay_arrival: (stop.$.zpoz_prij)
                    ? parseInt(stop.$.zpoz_prij, 10)
                    : null,
                delay_departure: (stop.$.zpoz_odj)
                    ? parseInt(stop.$.zpoz_odj, 10)
                    : null,
                delay_type: (stop.$.zpoz_typ)
                    ? parseInt(stop.$.zpoz_typ, 10)
                    : null,
                departure_time: (departure) ? stop.$.odj : null,
                departure_timestamp: (departure) ? departure.utc().valueOf() : null,
                trips_id: primaryKey,
            };
        });
        res.stops = await Promise.all(promises);

        return res;
    }

    private checkMidnight = (now, start): number => {
        if (now.hour() - start.hour() <= -(24 - 12)) { // "backwards" 12 hours
            return -1;
        } else if (now.hour() - start.hour() >= (24 - 6)) { // "forwards" 6 hours
            return 1;
        }
        return 0; // same day
    }

    /**
     * Fix source negative bearing value due to overflow by adding 256
     *
     * @param {number} bearing
     * @returns {number}
     */
    private fixSourceNegativeBearing(bearing: number): number {
        return bearing < 0 ? bearing + 256 : bearing;
    }

}
