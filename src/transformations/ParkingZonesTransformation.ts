"use strict";

import GeoJsonTransformation from "./GeoJsonTransformation";
import ITransformation from "./ITransformation";

const request = require("request-promise");
const csvtojson = require("csvtojson");
const config = require("../config/ConfigLoader");

export default class ParkingZonesTransformation extends GeoJsonTransformation implements ITransformation {

    public name: string;
    private tariffs: any[];

    constructor() {
        super();
        this.name = "ParkingZones";
        this.tariffs = null;
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
            await this.initTariffsEnum();
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
            res.properties.midpoint = this.middlePoint(res.properties.southwest, res.properties.northeast);
        }

        return res;
    }

    private initTariffsEnum = async () => {
        const body = await request({
            headers: {},
            method: "GET",
            url: config.datasources.ParkingZonesTariffs,
        });
        let tariffsEnum = await csvtojson({
            noheader: false,
            output: "csv",
        }).fromString(body);
        tariffsEnum = tariffsEnum.sort((a, b) => {
            if (a[1] < b[1]) {
                return -1;
            } else if (a[1] > b[1]) {
                return 1;
            } else {
                return a[2] - b[2];
            }
        });

        const tariffs = [];

        // TODO je blokujici?
        tariffsEnum.map((te) => {
            te.splice(0, 1);
            if (!tariffs[te[0]]) {
                tariffs[te[0]] = {};
            }
            if (!tariffs[te[0]][te[1]]) {
                tariffs[te[0]][te[1]] = new Set();
            }
            tariffs[te[0]][te[1]].add(JSON.stringify({
                divisibility: te[6],
                from: te[3],
                max_parking_time: te[5],
                price_per_hour: te[2],
                to: te[4],
            }));
        });

        // TODO je blokujici?
        Object.keys(tariffs).map((key) => {
            const ary = [];
            if (tariffs[key]["0"]) {
                ary.push({
                    day: { description: "Neděle", id: 0 },
                    hours: [...tariffs[key]["0"]].map((a) => JSON.parse(a)),
                });
            }
            if (tariffs[key]["1"]) {
                ary.push({
                    day: { description: "Pondělí", id: 1 },
                    hours: [...tariffs[key]["1"]].map((a) => JSON.parse(a)),
                });
            }
            if (tariffs[key]["2"]) {
                ary.push({
                    day: { description: "Úterý", id: 2 },
                    hours: [...tariffs[key]["2"]].map((a) => JSON.parse(a)),
                });
            }
            if (tariffs[key]["3"]) {
                ary.push({
                    day: { description: "Středa", id: 3 },
                    hours: [...tariffs[key]["3"]].map((a) => JSON.parse(a)),
                });
            }
            if (tariffs[key]["4"]) {
                ary.push({
                    day: { description: "Čtvrtek", id: 4 },
                    hours: [...tariffs[key]["4"]].map((a) => JSON.parse(a)),
                });
            }
            if (tariffs[key]["5"]) {
                ary.push({
                    day: { description: "Pátek", id: 5 },
                    hours: [...tariffs[key]["5"]].map((a) => JSON.parse(a)),
                });
            }
            if (tariffs[key]["6"]) {
                ary.push({
                    day: { description: "Sobota", id: 6 },
                    hours: [...tariffs[key]["6"]].map((a) => JSON.parse(a)),
                });
            }
            tariffs[key] = ary;
        });
        this.tariffs = tariffs;
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

    private middlePoint([lng1, lat1], [lng2, lat2]) {
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

}
