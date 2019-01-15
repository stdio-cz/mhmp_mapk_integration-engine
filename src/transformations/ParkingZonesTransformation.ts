"use strict";

import { ParkingZones } from "data-platform-schema-definitions";
import log from "../helpers/Logger";
import GeoJsonTransformation from "./GeoJsonTransformation";
import ITransformation from "./ITransformation";

const lodash = require("lodash");
const config = require("../config/ConfigLoader");

export default class ParkingZonesTransformation extends GeoJsonTransformation implements ITransformation {

    public name: string;
    private tariffs: any;

    constructor() {
        super();
        this.name = ParkingZones.name;
        this.tariffs = null;
    }

    public setTariffs = async (tariffsArray: any): Promise<void> => {
        tariffsArray = this.sortTariffs(tariffsArray);
        this.tariffs = await this.prepareTariffs(tariffsArray);
    }

    /**
     * Transforms data from data source to output format (geoJSON Feature)
     */
    public TransformDataElement = async (element): Promise<any> => {
        const types = {
            1: "Rezidentní úsek",
            2: "Smíšený úsek",
            3: "Návštěvnický úsek",
        };
        const res = {
            geometry: {
                coordinates: element.geometry.coordinates,
                type: element.geometry.type,
            },
            properties: {
                code: element.properties.TARIFTAB,
                midpoint: null,
                name: (types[parseInt(element.properties.TYPZONY, 10)])
                    ? types[parseInt(element.properties.TYPZONY, 10)] + " - " + element.properties.TARIFTAB
                    : element.properties.TARIFTAB,
                northeast: null,
                number_of_places: parseInt(element.properties.PS_ZPS, 10),
                payment_link: config.PARKINGS_PAYMENT_URL + "?shortname=" + element.properties.TARIFTAB,
                southwest: null,
                tariffs: [],
                timestamp: new Date().getTime(),
                type: {
                    description: (types[parseInt(element.properties.TYPZONY, 10)])
                        ? types[parseInt(element.properties.TYPZONY, 10)]
                        : "",
                    id: parseInt(element.properties.TYPZONY, 10),
                },
                zps_id: parseInt(element.properties.ZPS_ID, 10),
            },
            type: "Feature",
        };

        if (!this.tariffs) {
            log.warn("Warning! The parking zones tariffs havn't been set.");
        }

        res.properties.tariffs = this.tariffs[res.properties.code];

        if (res.geometry.type === "Polygon") {
            const result = await this.filterAndFindMinMax(res.geometry.coordinates[0]);
            res.geometry.coordinates[0] = result.coords;
            res.properties.southwest = result.min;
            res.properties.northeast = result.max;
        } else if (res.geometry.type === "MultiPolygon") {
            const result = await this.filterAndFindMinMaxMulti(res.geometry.coordinates);
            res.geometry.coordinates = result.coords;
            res.properties.southwest = result.min;
            res.properties.northeast = result.max;
        }
        if (res.properties.southwest && res.properties.northeast) {
            res.properties.midpoint = this.findMiddlePoint(res.properties.southwest, res.properties.northeast);
        }

        return res;
    }

    /**
     * Overrides GeoJsonTransformation::TransformDataCollection
     */
    public TransformDataCollection = async (collection): Promise<any> => {
        const res = {
            features: [],
            type: "FeatureCollection",
        };

        if (!this.tariffs) {
            log.warn("Warning! The parking zones tariffs havn't been set.");
        }

        const promises = collection.map(async (element) => {
            const transformed = await this.TransformDataElement(element);
            res.features.push(transformed);
            return;
        });

        await Promise.all(promises);

        const sorted = res.features.sort((a, b) => {
            if (a.properties.code < b.properties.code) {
                return -1;
            } else if (a.properties.code > b.properties.code) {
                return 1;
            } else {
                return a.properties.zps_id - b.properties.zps_id;
            }
        });

        // mergingIterator JS Closure
        const mergingIterator = async (i, cb) => {
            if (sorted.length === i || !sorted[i + 1]) {
                return cb();
            }

            if (sorted[i].properties.code === sorted[i + 1].properties.code) {
                if (sorted[i].geometry.type === "Polygon") {
                    sorted[i].geometry.type = "MultiPolygon";
                    sorted[i].geometry.coordinates = [
                        sorted[i].geometry.coordinates,
                        sorted[i + 1].geometry.coordinates,
                    ];
                    sorted[i].properties.zps_ids = [
                        sorted[i].properties.zps_id,
                        sorted[i + 1].properties.zps_id,
                    ];
                    sorted[i].properties.zps_id = null;
                    sorted[i].properties.number_of_places += sorted[i + 1].properties.number_of_places;

                    const minMaxResult = await this.filterAndFindMinMaxMulti(sorted[i].geometry.coordinates);
                    sorted[i].properties.southwest = minMaxResult.min;
                    sorted[i].properties.northeast = minMaxResult.max;

                    if (sorted[i].properties.southwest && sorted[i].properties.northeast) {
                        sorted[i].properties.midpoint = this.findMiddlePoint(sorted[i].properties.southwest,
                            sorted[i].properties.northeast);
                    }
                } else if (sorted[i].geometry.type === "MultiPolygon") {
                    sorted[i].geometry.coordinates.push(sorted[i + 1].geometry.coordinates);
                    sorted[i].properties.zps_ids.push(sorted[i + 1].properties.zps_id);
                    sorted[i].properties.number_of_places += sorted[i + 1].properties.number_of_places;

                    const minMaxResult = await this.filterAndFindMinMaxMulti(sorted[i].geometry.coordinates);
                    sorted[i].properties.southwest = minMaxResult.min;
                    sorted[i].properties.northeast = minMaxResult.max;

                    if (sorted[i].properties.southwest && sorted[i].properties.northeast) {
                        sorted[i].properties.midpoint = this.findMiddlePoint(sorted[i].properties.southwest,
                            sorted[i].properties.northeast);
                    }
                }
                sorted.splice(i + 1, 1);
                i--;
            }

            setImmediate(mergingIterator.bind(null, i + 1, cb));
        };
        return new Promise((resolve, reject) => {
            mergingIterator(0, () => {
                res.features = sorted;
                resolve(res);
            });
        });
    }

    /**
     * Reduces two identical consecutive points to one and find min and max points in the polygon.
     */
    private filterAndFindMinMax = async (coords) => {
        const seen = {};
        let minLng = null;
        let minLat = null;
        let maxLng = null;
        let maxLat = null;

        const newArr = coords.filter((item, index) => {
            // min, max finding
            if (!minLng || minLng > item[0]) {
                minLng = item[0];
            }
            if (!minLat || minLat > item[1]) {
                minLat = item[1];
            }
            if (!maxLng || maxLng < item[0]) {
                maxLng = item[0];
            }
            if (!maxLat || maxLat < item[1]) {
                maxLat = item[1];
            }

            // filtering
            if (index === coords.length - 1) {
                return (seen[item] = true);
            }
            return seen.hasOwnProperty(item) ? false : (seen[item] = true);
        });
        return { coords: newArr, min: [minLng, minLat], max: [maxLng, maxLat] };
    }

    /**
     * Apply this.filterAndFindMinMax to MultiPolygon
     */
    private filterAndFindMinMaxMulti = async (multi) => {
        let minLng = null;
        let minLat = null;
        let maxLng = null;
        let maxLat = null;
        const newArr = [];

        const multiCoordsIterator = async (i) => {
            if (multi.length === i) {
                return;
            }
            const r = await this.filterAndFindMinMax(multi[i][0]);
            if (!minLng || minLng > r.min[0]) {
                minLng = r.min[0];
            }
            if (!minLat || minLat > r.min[1]) {
                minLat = r.min[1];
            }
            if (!maxLng || maxLng < r.max[0]) {
                maxLng = r.max[0];
            }
            if (!maxLat || maxLat < r.max[1]) {
                maxLat = r.max[1];
            }
            newArr.push([r.coords]);
            return await multiCoordsIterator(i + 1);
        };
        await multiCoordsIterator(0);
        return { coords: newArr, min: [minLng, minLat], max: [maxLng, maxLat] };
    }

    private findMiddlePoint([lng1, lat1], [lng2, lat2]) {
        const toRad = (num: number) => {
            return num * Math.PI / 180;
        };

        const toDeg = (num: number) => {
            return num * (180 / Math.PI);
        };

        // Longitude difference
        const dLng = toRad(lng2 - lng1);

        // Convert to radians
        lat1 = toRad(lat1);
        lat2 = toRad(lat2);
        lng1 = toRad(lng1);

        const bX = Math.cos(lat2) * Math.cos(dLng);
        const bY = Math.cos(lat2) * Math.sin(dLng);
        const lat3 = Math.atan2(Math.sin(lat1) + Math.sin(lat2),
            Math.sqrt((Math.cos(lat1) + bX) * (Math.cos(lat1) + bX) + bY * bY));
        const lng3 = lng1 + Math.atan2(bY, Math.cos(lat1) + bX);

        // Return result
        return [toDeg(lng3), toDeg(lat3)];
    }

    /**
     * Tariff processing
     * tariffs array sorting
     */
    private sortTariffs = (tariffsArray: any): any => {
        return tariffsArray.sort((a, b) => {
            if (a.code < b.code) { // ASC
                return -1;
            } else if (a.code > b.code) {
                return 1;
            } else {
                if (a.day < b.day) { // ASC
                    return -1;
                } else if (a.day > b.day) {
                    return 1;
                } else {
                    if (a.price_per_hour < b.price_per_hour) { // ASC
                        return -1;
                    } else if (a.price_per_hour > b.price_per_hour) {
                        return 1;
                    } else {
                        if (a.time_from > b.time_from) { // DESC
                            return -1;
                        } else if (a.time_from < b.time_from) {
                            return 1;
                        } else {
                            if (a.max_parking_time > b.max_parking_time) { // DESC
                                return -1;
                            } else if (a.max_parking_time < b.max_parking_time) {
                                return 1;
                            } else {
                                if (a.divisibility > b.divisibility) { // DESC
                                    return -1;
                                } else if (a.divisibility < b.divisibility) {
                                    return 1;
                                } else {
                                    return 0;
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Tariff processing
     * prepare to task all zones
     */
    private prepareTariffs = async (inputData) => {
        const cleanOut = {};

        const groupedByCode = lodash.groupBy(inputData, "code");
        const byCodeDone = await Object.keys(groupedByCode).map(async (item) => {
            if (!cleanOut[item]) {
                cleanOut[item] = {};
            }
            // task to every "day"
            const groupedByDay = lodash.groupBy(groupedByCode[item], "day");
            const byDayDone = Object.keys(groupedByDay).map(async (picked) => {
                // task to clean
                const cleanInterval = await this.cleanTariffsForZone(groupedByDay[picked]);
                // add to return out
                cleanOut[item][picked] = cleanInterval;
            });
            await Promise.all(byDayDone);

            const mergedDays = [];
            await Promise.all([0, 1, 2, 3, 4, 5, 6].map((day) => {
                if (cleanOut[item][day]) {
                    const exist = lodash.findIndex(mergedDays, (o) => {
                        return JSON.stringify(o.intervals) === JSON.stringify(cleanOut[item][day]);
                    });
                    if (mergedDays.length === 0) {
                        mergedDays.push(Object.assign({days: [day]}, {intervals: cleanOut[item][day]}));
                    } else if (exist !== -1) {
                        mergedDays[exist].days.push(day);
                    } else {
                        mergedDays.push(Object.assign({days: [day]}, {intervals: cleanOut[item][day]}));
                    }
                }
                return Promise.resolve();
            }));
            cleanOut[item] = mergedDays;
        });
        await Promise.all(byCodeDone);
        return cleanOut;
    }

    /**
     * Tariff processing
     *
     */
    private cleanTariffsForZone = (days) => {
        // output array
        const out = [];
        out[0] = days[0];

        // JS Closure
        const asyncWhile = async (whileLoop, cb) => {

            let continu = false;

            // loop to compare inputs item with outputs
            days.forEach((day) => {
                delete day.code;
                delete day.day;

                if (day.price_per_hour <= out[whileLoop].price_per_hour) {
                    // if interval is same or in output interval
                    if (this.inRange(day.time_from, out[whileLoop].time_from, out[whileLoop].time_to)
                            && this.inRange(day.time_to, out[whileLoop].time_from, out[whileLoop].time_to)) {
                        /* do nothing */
                    } else if ((day.time_from > out[whileLoop].time_to
                            && this.inRange(day.time_to, out[whileLoop].time_from, out[whileLoop].time_to))
                            || (day.time_from < out[whileLoop].time_to
                            && this.inRange(day.time_to, out[whileLoop].time_from, out[whileLoop].time_to))) {
                        // join interval on outputs start "new (original)""
                        out[whileLoop].time_from = day.time_from;
                    } else if ((out[whileLoop].time_to < day.time_to
                            && this.inRange(day.time_from, out[whileLoop].time_from, out[whileLoop].time_to))
                            || (day.time_to < out[whileLoop].time_to
                            && this.inRange(day.time_from, out[whileLoop].time_from, out[whileLoop].time_to))) {
                        // join interval on end "(original) new"
                        out[whileLoop].time_to = day.time_to;
                    } else if (!lodash.find(out, day)) {
                        // check duplicity add item to outputs interval
                        // add
                        out.push(day);
                        continu = true;
                    }
                } else {
                    const index = out.findIndex((x) => x.time_from === day.time_from && x.time_to === day.time_to);

                    out.forEach((o, l) => {
                        // if interval exist change price because of condition after for
                        if (out[l].time_from === day.time_from
                                && out[l].time_to === day.time_to && index >= 0) {
                            // change price to higher
                            out[l].price_per_hour = day.price_per_hour;
                        } else if (this.inRange(day.time_from - 1, out[l].time_from, out[l].time_to, true)
                                && this.inRange(day.time_to + 1, out[l].time_from, out[l].time_to, true)) {
                            // new interval in some exist intervla (old)(new)(old)
                            // midle
                            const last = day;
                            last.time_from = day.time_to + 1;
                            last.time_to = out[l].time_to;
                            // first
                            out[l].time_to = day.time_from - 1;
                            // second
                            out.push(day);
                            // thirt
                            out.push(last);
                        } else if (!this.inRange(day.time_from - 1, out[l].time_from, out[l].time_to, true)
                                && this.inRange(day.time_to, out[l].time_from, out[l].time_to)) {
                            // new interval on start of exist intervla (new)(old)
                            // start
                            out[l].time_from = day.time_to + 1;
                            out.push(day);
                        } else if (this.inRange(day.time_from, out[l].time_from, out[l].time_to)
                                && !this.inRange(day.time_to + 1, out[l].time_from, out[l].time_to, true)) {
                            // new interval on end of exist intervla (old)(new)
                            // end
                            out[l].time_to = day.time_from - 1;
                            out.push(day);
                        } else if (!this.inRange(day.time_from - 1, out[l].time_from, out[l].time_to, true)
                                && !this.inRange(day.time_to + 1, out[l].time_from, out[l].time_to, true)) {
                            // new interval (new)   (old)
                            // end
                            out.push(day);
                        } else if (index === -1) {
                            // do nothing
                        }
                    });
                }
            });

            // end of while loop
            if (!continu) {
                return cb();
            }

            // call next iteration
            setImmediate(asyncWhile.bind(null, whileLoop + 1, cb));
        };

        // return clean intervals as promise
        return new Promise((resolve, reject) => {
            // initial call of async while
            asyncWhile(0, () => {
                resolve(Object.assign(out));
            });
        });
    }

    /**
     * Tariff processing
     * return true if input(val) is in range(from-to)
     */
    private inRange = (val, from, to, deviation = false) => {

        if (!deviation) {
            val = lodash.round(val, -1);
            from = lodash.round(from, -1);
            to = lodash.round(to, -1);
        }

        if (to === 1439) {
            to = 0;
        }
        if (from === 0) {
            from = 1439;
        }

        if (from > to) {
            if (lodash.includes(lodash.range(from, 1441), val)
                || lodash.includes(lodash.range(0, to), val) || from === val || to === val) {
                return true;
            }
        } else {
            if (lodash.includes(lodash.range(from, to), val) || from === val || to === val) {
                return true;
            }
        }
        return false;
    }

}
