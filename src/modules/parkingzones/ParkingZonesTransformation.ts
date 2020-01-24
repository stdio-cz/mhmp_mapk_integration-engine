"use strict";

import { ParkingZones } from "@golemio/schema-definitions";
import { config } from "../../core/config";
import { BaseTransformation, ITransformation } from "../../core/transformations";

import * as lodash from "lodash";

interface IDatasourceTariff {
    timeFrom: string;
    payAtHoliday: boolean;
    maxParkingTime: string;
    timeTo: string;
    pricePerHour: number;
    maxPrice: number;
    divisibility: string;
}

interface IOutputTariff {
    divisibility: string;
    max_parking_time: string;
    max_price: number;
    pay_at_holiday: boolean;
    price_per_hour: number;
    time_from: string;
    time_to: string;
}

export class ParkingZonesTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = ParkingZones.name;
    }

    /**
     * Overrides BaseTransformation::transform
     */
    public transform = async (data: any | any[]): Promise<any | any[]> => {

        if (data instanceof Array) {
            const promises = data.map((element) => {
                return this.transformElement(element);
            });
            const res = await Promise.all(promises);

            const sorted = res.sort((a, b) => {
                if (a.properties.id < b.properties.id) {
                    return -1;
                } else if (a.properties.id > b.properties.id) {
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

                if (sorted[i].properties.id === sorted[i + 1].properties.id) {
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

                    resolve(sorted);
                });
            });
        } else {
            return this.transformElement(data);
        }
    }

    /**
     * Tariff processing
     */
    public transformTariffs = async (id: string, data: any): Promise<any> => {
        const resultTariffs: Array<{ tariff: IOutputTariff[], days: string[]}> = [];

        if (!data) {
            throw Error(`Tarif pro ${id} nebyl nalezen.`);
        }

        const promises1 = data.map(async (tariff: { tariff: IDatasourceTariff[], day: string}) => {
            const dayOfWeek = tariff.day;

            const exist = lodash.findIndex(resultTariffs, (o) => {
                if (o.tariff.length !== tariff.tariff.length) {
                    return false;
                }
                for (let i = 0; i < o.tariff.length; i++) {
                    if (
                        o.tariff[i].divisibility !== tariff.tariff[i].divisibility
                        || o.tariff[i].max_parking_time !== tariff.tariff[i].maxParkingTime
                        || o.tariff[i].max_price !== tariff.tariff[i].maxPrice
                        || o.tariff[i].pay_at_holiday !== tariff.tariff[i].payAtHoliday
                        || o.tariff[i].price_per_hour !== tariff.tariff[i].pricePerHour
                        || o.tariff[i].time_from !== tariff.tariff[i].timeFrom
                        || o.tariff[i].time_to !== tariff.tariff[i].timeTo
                    ) {
                        return false;
                    }
                }
                return true;
            });

            if (resultTariffs.length === 0) {
                resultTariffs.push({
                    days: [dayOfWeek],
                    tariff: tariff.tariff ? tariff.tariff.map((x) => this.transformTariffItem(x)) : null,
                });
            } else if (exist !== -1) {
                resultTariffs[exist].days.push(dayOfWeek);
            } else {
                resultTariffs.push({
                    days: [dayOfWeek],
                    tariff: tariff.tariff ? tariff.tariff.map((x) => this.transformTariffItem(x)) : null,
                });
            }
            return;
        });
        await Promise.all(promises1);

        return {
            tariffs: (resultTariffs.length) ? resultTariffs : null,
            tariffsText: (resultTariffs.length) ? this.stringifyTariffs(resultTariffs).join("; ") : null,
        };
    }

    protected transformTariffItem = (value: IDatasourceTariff): IOutputTariff => {
        return {
            divisibility: value.divisibility,
            max_parking_time: value.maxParkingTime,
            max_price: value.maxPrice,
            pay_at_holiday: value.payAtHoliday,
            price_per_hour: value.pricePerHour,
            time_from: value.timeFrom,
            time_to: value.timeTo,
        };
    }

    protected transformElement = async (element: any): Promise<any> => {
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
                id: element.properties.TARIFTAB,
                midpoint: null,
                name: (types[parseInt(element.properties.TYPZONY, 10)])
                    ? element.properties.TARIFTAB + " " + types[parseInt(element.properties.TYPZONY, 10)]
                    : element.properties.TARIFTAB,
                northeast: null,
                number_of_places: parseInt(element.properties.PS_ZPS, 10),
                payment_link: (element.properties.TARIFTAB)
                    ? config.PARKING_ZONES_PAYMENT_URL + "?shortname=" + element.properties.TARIFTAB
                    : null,
                southwest: null,
                tariffs: [],
                type: {
                    description: (types[parseInt(element.properties.TYPZONY, 10)])
                        ? types[parseInt(element.properties.TYPZONY, 10)]
                        : "",
                    id: parseInt(element.properties.TYPZONY, 10),
                },
                updated_at: new Date().getTime(),
                zps_id: parseInt(element.properties.ZPS_ID, 10),
            },
            type: "Feature",
        };

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
     * from object to string
     */
    private stringifyTariffs = (resultTariffs) => {
        const weekdays = {
            Friday: { abbr: "Pá", id: 5 },
            Monday: { abbr: "Po", id: 1 },
            Saturday: { abbr: "So", id: 6 },
            Sunday: { abbr: "Ne", id: 7 },
            Thursday: { abbr: "Čt", id: 4 },
            Tuesday: { abbr: "Út", id: 2 },
            Wednesday: { abbr: "St", id: 3 },
        };

        const resultString = [];

        for (let i = 0, imax = resultTariffs.length; i < imax; i++) {
            const t = resultTariffs[i];
            let days: string = "";
            t.days = t.days.sort((a, b) => weekdays[a].id - weekdays[b].id);
            t.tariff = t.tariff.sort((a, b) => a.pay_at_holiday - b.pay_at_holiday);

            for (let j = 0, jmax = t.days.length; j < jmax; j++) {
                if (days === "") {
                    days += weekdays[t.days[j]].abbr;
                } else if (days.indexOf("-") === -1) {
                    days += "-" + weekdays[t.days[j]].abbr;
                } else {
                    days = days.split("-")[0] + "-" + weekdays[t.days[j]].abbr;
                }
            }

            for (let j = 0, jmax = t.tariff.length; j < jmax; j++) {
                resultString.push(days
                    + ((t.tariff[j].pay_at_holiday) ? " (ve svátek)" : "")
                    + " " + this.parsePT(t.tariff[j].time_from, true)
                    + "-" + this.parsePT(t.tariff[j].time_to, true)
                    + " " + t.tariff[j].price_per_hour + " Kč/hod."
                    + " (max. "
                    + parseInt(this.parsePT(t.tariff[j].max_parking_time, false), 10) / 1000 / 60 / 60
                    + " hod.)");
            }
        }
        return resultString;
    }

    /**
     * Tariff processing
     * helper function for parse durations format
     */
    private parsePT = (PT, format) => {
        const matches = PT.toLowerCase().match(/pt{1}(\d{1,2}h){0,1}(\d{1,2}m){0,1}(\d{1,2}s){0,1}/);
        let sum = 0;

        if (matches && matches.length) {
            for (let i = 1; i < matches.length; i++) {
                let value = matches[i];
                if (value && value.indexOf("h") > -1) {
                    value = parseInt(value.replace(/[hms]+/, ""), 10) * 60 * 60 * 1000;
                } else if (value && value.indexOf("m") > -1) {
                    value = parseInt(value.replace(/[hms]+/, ""), 10) * 60 * 1000;
                } else if (value && value.indexOf("s") > -1) {
                    value = parseInt(value.replace(/[hms]+/, ""), 10) * 1000;
                } else {
                    value = 0;
                }
                sum += value;
            }
        }

        if (format) {
            const hours = Math.trunc(sum / 1000 / 60 / 60);
            const minutes = (sum / 1000 / 60) - (Math.trunc(sum / 1000 / 60 / 60) * 60);

            let hoursString = hours.toString();
            if (hoursString.length < 2) {
                hoursString = "0" + hoursString;
            }

            let minutesString = minutes.toString();
            if (minutesString.length < 2) {
                minutesString = "0" + minutesString;
            }

            return hoursString + ":" + minutesString;
        } else {
            return sum.toString();
        }
    }

}
