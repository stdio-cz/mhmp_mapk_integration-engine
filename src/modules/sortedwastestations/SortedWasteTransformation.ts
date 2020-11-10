"use strict";

import {
    IPRSortedWasteStationsTransformation,
} from "./";

import * as proj4 from "proj4";
import * as getUuid from "uuid-by-string";

export class SortedWasteTransformation {
    private iprTransformation: IPRSortedWasteStationsTransformation;

    constructor() {
        this.iprTransformation = new IPRSortedWasteStationsTransformation();
    }

    public getStationCode = (containerCode: string): string => {
        return containerCode?.split("C")[0] || "unknown";
    }

    public getPotexContainersByStationCode = (containers: any, stationsByCode: any): any => {
        const stationCodes = Object.keys(stationsByCode);
        const containerCodes = [];
        // tslint:disable: object-literal-sort-keys variable-name
        containers.forEach((container: any) => {
            let found = false;
            for (const stationCode of stationCodes) {
                const distance = this.calculateDistanceBetweenPoints(
                    [container.lng, container.lat],
                    [
                        stationsByCode[stationCode].station.longitude,
                        stationsByCode[stationCode].station.latitude,
                    ],
                );

                if (distance < 30) {
                    found = true;
                    const code = `${stationCode}C${[container.lng, container.lat].join("-")}`;

                    if (!containerCodes.includes(code)) {
                        containerCodes.push(code);
                        stationsByCode[stationCode].containers.push({
                            id: getUuid(code),
                            code,
                            cleaning_frequency_interval: 0,
                            cleaning_frequency_frequency: 0,
                            station_code: stationCode,
                            total_volume: null,
                            trash_type: 8,
                            prediction: null,
                            bin_type: null,
                            installed_at: null,
                            network: null,
                            source: "potex",
                        });
                    }
                    break;
                }
            }

            if (!found) {
                const stationCode = [container.lng, container.lat].join("/");

                if (!stationsByCode[stationCode]) {
                    stationsByCode[stationCode] = this.getNewPotexStation(container, stationCode);
                }
                const code = `${stationCode}C${container.city}`;

                if (!containerCodes.includes(code)) {
                    containerCodes.push(code);
                    stationsByCode[stationCode].containers.push({
                        code,
                        id: getUuid(code),
                        cleaning_frequency_interval: 0,
                        cleaning_frequency_frequency: 0,
                        station_code: stationCode,
                        total_volume: null,
                        trash_type: 8,
                        prediction: null,
                        bin_type: null,
                        installed_at: null,
                        network: null,
                        source: "potex",
                    });
                }
            }
        });
        // tslint:enable
        return stationsByCode;
    }

    public getNewPotexStation = (container: any, stationCode: string) => {
        // tslint:disable: object-literal-sort-keys variable-name
        return {
            containers: [],
            station: {
                accessibility: 3,
                address: container.address,
                code: stationCode,
                district: container.city,
                district_code:  null,
                id: getUuid(stationCode),
                knsko_id: null,
                latitude: container.lat,
                longitude: container.lng,
                source: "potex",
            },
        };
        // tslint:enable
    }

    public getOictContainersByStationCode = (containers: any, stationsByCode: any): any => {
        const stationCodes = Object.keys(stationsByCode);
        // tslint:disable: object-literal-sort-keys variable-name

        containers.forEach((container: any) => {
            let found = false;
            for (const stationCode of stationCodes) {
                const distance = this.calculateDistanceBetweenPoints(
                    container.coordinates,
                    [
                        stationsByCode[stationCode].station.longitude,
                        stationsByCode[stationCode].station.latitude,
                    ],
                );

                if (distance < 30) {
                    found = true;
                    const code =  `${stationCode}C${container.unique_id
                        .replace("diakonie-broumov_", "")}`;

                    stationsByCode[stationCode].containers.push({
                        id: getUuid(code),
                        code,
                        cleaning_frequency_interval: Math.floor((container?.cleaning_frequency || 0) / 10),
                        cleaning_frequency_frequency: (container?.cleaning_frequency || 0) % 10,
                        station_code: stationCode,
                        total_volume: null,
                        trash_type: this.iprTransformation.getTrashTypeByString(container?.trash_type).id,
                        prediction: null,
                        bin_type: null,
                        installed_at: null,
                        network: null,
                        source: "oict",
                    });
                    break;
                }
            }

            if (!found) {
                const stationCode = container.coordinates.join("/");
                const newStation = this.getNewOictStation(container, stationCode);

                if (!stationsByCode[stationCode]) {
                    stationsByCode[stationCode] = newStation;
                } else {
                    stationsByCode[stationCode].containers.concat(newStation.containers);
                }
            }
        });
        // tslint:enable
        return stationsByCode;
    }

    public getNewOictStation = (container: any, stationCode: string) => {
        // tslint:disable: object-literal-sort-keys variable-name
        return {
            containers: [],
            station: {
                accessibility: this.iprTransformation.getAccessibilityByString(
                    container.accessibility,
                    ).id,
                address: container.address,
                code: stationCode,
                district: container.district,
                district_code:  null,
                id: getUuid(stationCode),
                knsko_id: null,
                latitude: container.coordinates[1],
                longitude: container.coordinates[0],
                source: "oict",
            },
        };
        // tslint:enable
    }

    public getKsnkoStationsByCode = (stations: any) => {
        const stationsByCode: any = [];
        // tslint:disable-next-line: max-line-length
        proj4.defs( "EPSG:5514", "+title=Krovak +proj=krovak +lat_0=49.5 +lon_0=24.83333333333333 +alpha=30.28813972222222 +k=0.9999 +x_0=0 +y_0=0 +ellps=bessel +units=m +towgs84=570.8,85.7,462.8,4.998,1.587,5.261,3.56 +no_defs" );

        stations.forEach((station: any) => {
            const latlon = proj4( "EPSG:5514" ).inverse([station.coordinate.lat, station.coordinate.lon]);

            stationsByCode[station.number] = {
                containers: [],
                station: {
                    accessibility: this.iprTransformation.getAccessibilityByString(
                        station.access,
                        ).id,
                    address: station.name,
                    code: station.number,
                    district: station.cityDistrict.name,
                    district_code:  station.cityDistrict.ruianCode,
                    id: getUuid(station.number),
                    knsko_id: station.id,
                    latitude: latlon[1],
                    longitude: latlon[0],
                    source: "ksnko",
                },
            };

            station.containers.forEach((container: any) => {
                stationsByCode[station.number].containers.push({
                    code: container.code,
                    id: getUuid(container.code),
                    knsko_code: container.code,
                    knsko_id: container.id,
                    station_code: station.number,
                    total_volume: null,
                    // tslint:disable-next-line: object-literal-sort-keys
                    prediction: null,
                    bin_type: null,
                    installed_at: null,
                    network: null,
                    cleaning_frequency_interval: container?.cleaningFrequency?.code  % 10,
                    cleaning_frequency_frequency: Math.floor(container?.cleaningFrequency?.code / 10),
                    company: null,
                    container_type: container?.container?.name,
                    trash_type: this.iprTransformation.getTrashTypeByString(container?.trashType?.code).id ||
                        this.iprTransformation.getTrashTypeByString(container?.trashType?.name).id,
                    source: "ksnko",
                });
            });
        });

        return stationsByCode;
    }

    public getSensorContainersByStationCode = (containers: any, stationsByCode: any): any => {
        containers.forEach((container: any) => {
            // tslint:disable: object-literal-sort-keys variable-name
            const station_code = this.getStationCode(container.code);

            if (!stationsByCode[station_code]) {
                stationsByCode[station_code] = {
                    containers: [],
                    station: {
                        accessibility: 3,
                        address: container.address,
                        code: station_code,
                        district: container.district,
                        district_code:  container.postal_code,
                        id: getUuid(station_code),
                        knsko_id: null,
                        latitude: container.latitude,
                        longitude: container.longitude,
                        source: "sensoneo",
                    },
                };
            }
            // what should be the source ?
            // stationsByCode[station_code].station.properties.SOURCE = "sensoneo";

            const trashType = this.iprTransformation.getTrashTypeByString(container.trash_type).id;
            let containerUpdated = false;

            for (const storedContainer of stationsByCode[station_code].containers) {
                if (trashType === storedContainer.trash_type) {
                    storedContainer.code = container.code;
                    storedContainer.id = getUuid(container.code);
                    storedContainer.knsko_code = null;
                    storedContainer.knsko_id = null;
                    storedContainer.station_code = storedContainer.station_code || this.getStationCode(container.code);
                    storedContainer.total_volume = container.total_volume;
                    storedContainer.trash_type = storedContainer.trash_type ||
                        this.iprTransformation.getTrashTypeByString(container.trash_type).id;
                    storedContainer.prediction = container.prediction;
                    storedContainer.bin_type = storedContainer.bin_type || container.bin_type;
                    storedContainer.installed_at = container.installed_at;
                    storedContainer.network = container.network;
                    storedContainer.source = "sensoneo",
                    containerUpdated = true;
                    break;
                }
            }

            // should we add new - only in sensoneo not in ksnko
            if (!containerUpdated) {
                stationsByCode[station_code].containers.push({
                    id: getUuid(container.code),
                    trash_type: trashType,
                    code: container.code,
                    station_code: this.getStationCode(container.code),
                    total_volume: container.total_volume,
                    prediction: container.prediction,
                    bin_type: container.bin_type,
                    installed_at: container.installed_at,
                    network: container.network,
                    source: "sensoneo",
                });
            }

            // tslint:enable
        });

        return stationsByCode;
    }

    public getMeasurements = (containers: any): any => {
        return containers.map((container: any) => {
            // tslint:disable: object-literal-sort-keys
            return {
                container_code: container.code,
                container_id: getUuid(container.code),
                station_code: this.getStationCode(container.code),
                percent_calculated: container.percent_calculated,
                upturned: container.upturned,
                temperature: container.temperature,
                battery_status: container.battery_status,
                measured_at: container.measured_at,
                measured_at_utc: container.measured_at_utc,
                prediction: container.prediction,
                prediction_utc: container.prediction_utc,
                firealarm: container.firealarm,
            };
            // tslint:enable
        });
    }

    public getPicks = (containers: any): any => {
        return containers.map((container: any) => {
            // tslint:disable: object-literal-sort-keys
            return {
                container_code: container.code,
                container_id: getUuid(container.code),
                station_code: this.getStationCode(container.code),
                percent_before: container.percent_before,
                percent_now: container.percent_now,
                event_driven: container.event_driven,
                decrease: container.decrease,
                pick_at: container.pick_at,
                pick_at_utc: container.pick_at_utc,
                pick_minfilllevel: container.pick_minfilllevel,
            };
            // tslint:enable
        });
    }

    private calculateDistanceBetweenPoints = (coord1: number[], coord2: number[]) => {
        const [lng1, lat1] = coord1;
        const [lng2, lat2] = coord2;

        const R = 6371; // Radius of the earth in km
        const dLat = this.deg2rad(lat2 - lat1); // deg2rad below
        const dLng = this.deg2rad(lng2 - lng1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2)
            ;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c * 1000; // Distance in m
        return d;
    }

    private deg2rad = (deg: number) => {
        return deg * (Math.PI / 180);
    }

}
