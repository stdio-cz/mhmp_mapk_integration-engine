"use strict";

import { config } from "../../core/config";
import {
    IPRSortedWasteStationsTransformation,
} from "./";

import { log } from "../../core/helpers";
import { PostgresModel } from "../../core/models";

import * as proj4 from "proj4";
import * as getUuid from "uuid-by-string";

import * as moment from "moment";

export class SortedWasteTransformation {
    private iprTransformation: IPRSortedWasteStationsTransformation;

    constructor() {
        this.iprTransformation = new IPRSortedWasteStationsTransformation();
    }

    public getSortedWastePicksWithDates = async (containers: any[], containerModel: PostgresModel) => {
        const containersPickDates = {};
        const foundContainers = {};
        const outData = {
            pickDates: [],
            pickDays: [],
        };
        // let nomatch = 0;
        // let diffFreq = 0;

        for (const container of containers) {
            // trash type and station code (sometimes missing)
            if (container[5] && container[11]) {
                // multiple trash types - U,P,E
                for (const trash of (container[5].split(","))) {
                    let matchingContainer: any;
                    if (!foundContainers[`${container[11]}${trash}`]) {
                        matchingContainer = await this.getMatchingContainerFromDB(
                            container[11],
                            this.iprTransformation.getTrashTypeByString(trash).id,
                            containerModel,
                        );
                        foundContainers[`${container[11]}${trash}`] = matchingContainer;
                    } else {
                        matchingContainer = foundContainers[`${container[11]}${trash}`];
                    }
                    if (matchingContainer) {
                        if (!containersPickDates[matchingContainer.id]) {
                            containersPickDates[matchingContainer.id] = {
                                code: +container[3],
                                codeStored: +`0${
                                    (matchingContainer.cleaning_frequency_interval || 0 * 10) +
                                    matchingContainer.cleaning_frequency_frequency || 0}`,
                                counted: [],
                                pickDays: matchingContainer.pick_days,
                                raw: [],
                                storedCleaningFrequency: matchingContainer.cleaning_frequency_frequency,
                                storedCleaningInterval: matchingContainer.cleaning_frequency_interval,
                            };
                        }
                        // if (containersPickDates[matchingContainer.id].code !==
                        //     containersPickDates[matchingContainer.id].codeStored) {
                        //     containersPickDates[matchingContainer.id].codeStored =
                        //     containersPickDates[matchingContainer.id].code;
                        //     // prepared for the future when data will be fixed
                        //     diffFreq++;
                        // }
                        containersPickDates[matchingContainer.id].raw.push({
                            frequency: container[12],
                            from: container[9],
                            to: container[10],
                        });
                    // } else {
                    //     // prepared for the future when data will be fixed
                    //     nomatch++;
                    }
                }
            }
        }

        const yearFromNow = moment(moment().add(1, "years").format("YYYY-MM-DD 12:00:00"));

        for (const id of Object.keys(containersPickDates)) {
            // filter out duplicities
            containersPickDates[id].raw = (containersPickDates[id].raw || [])
                .filter((pick: any, index: number, self: any[]) =>
                    index === self.findIndex((t: any) => (
                        t.from === pick.from &&
                        t.to === pick.to &&
                        t.frequency === pick.frequency &&
                        pick.frequency &&
                        pick.from
                    )),
                );
            // sort by from dates
            containersPickDates[id].raw.sort((a: any, b: any) => (a.from > b.from) ? 1 : -1);
            // set `to` dates - not present everywhere
            containersPickDates[id].raw.forEach((pick: any, i: number) => {
                if (pick.from && pick.frequency) {
                    try {
                        pick.from = moment(pick.from);
                        if (pick.to) {
                            pick.to = moment(pick.to);
                        } else {
                            if (containersPickDates[id].raw[i + 1]) {
                                pick.to = moment(containersPickDates[id].raw[i + 1].from);
                            } else {
                                pick.to = yearFromNow;
                            }
                        }
                        pick.parsed = this.parsePicksIntervalString(pick.frequency);
                    } catch (err) {
                        log.warn("Can not parse pick dates", err);
                    }
                }
            });

            // calculate pick dates
            const pickDates = this.getPickDates(containersPickDates[id]);

            pickDates.dates.forEach((date: any) => {
                outData.pickDates.push({
                    container_id: id,
                    pick_date: `${date.format()}`,
                });
            });

            if (pickDates.pickDays !== containersPickDates[id].pickDays) {
                outData.pickDays.push({
                    id,
                    pickDays: pickDates.pickDays,
                });
            }
        }

        return outData;
    }

    public getPickDates = (container: any) => {

        const today = moment(moment().format("YYYY-MM-DD 12:00:00"));
        const thisYear = today.year();
        const calculateToTheFutureDays = config.datasources.SortedWastePicks.calculateToFutureDays;
        const calculateToTheFuture = moment().add(calculateToTheFutureDays, "days");

        const calculatedPickDates = {
            dates: [],
            pickDays: null,
        };

        container.raw.forEach((pick: any) => {
            const weeksOffset = Math.floor(container.code / 10);
            // only future records
            if (
                pick.parsed &&
                ((thisYear <= pick.parsed.year) || !thisYear) &&
                pick.from <= today &&
                pick.to >= today &&
                pick.parsed.days.length
            ) {
                let curProcDate = today;
                let curOffset = 0;
                let count = 0;

                calculatedPickDates.pickDays = pick.parsed.days.join(",");

                while (calculateToTheFuture >= curProcDate && count < 200) {
                    // just in case - dirty data
                    count++;
                    pick.parsed.days.forEach((day: number) => {
                        // new moment object, because it passes reference
                        const calculatedDate = moment(moment().format("YYYY-MM-DD 12:00:00")).day(day + curOffset);

                        if (calculatedDate >= today) {
                            if (pick.parsed.weeks.length) {
                                if (pick.parsed.weeks.includes(calculatedDate.week())) {
                                    calculatedPickDates.dates.push(calculatedDate);
                                }
                            } else {
                                calculatedPickDates.dates.push(calculatedDate);
                            }
                        }
                        curProcDate = calculatedDate;
                    });
                    if (pick.parsed.weeks.length) {
                        curOffset += 7;
                    } else {
                        curOffset += 7 * weeksOffset;
                    }
                }
            }
        });

        return calculatedPickDates;
    }

    public getWeekDayFromString = (day: string) => {
        switch (day) {
            case "Po":
                return 1;
            case "Út":
                return 2;
            case "St":
                return 3;
            case "Čt":
                return 4;
            case "Pá":
                return 5;
            case "So":
                return 6;
            case "Ne":
                return 7;
            default:
                return null;
        }
    }

    public parsePicksIntervalString = (picksString: string) => {
        // "2020-Po,Ne,2,6,10,14,18,22,26,30,34,38,42,46,50"
        // "2020-Po,Ne"
        const picksIntervals = {
            days: [],
            weeks: [],
            year: null,
        };

        const toYear = picksString.split("-");

        picksIntervals.year = toYear[0];

        const toDaysAndWeeks = toYear[1].split(",");

        toDaysAndWeeks.forEach((el: any) => {
            const day = this.getWeekDayFromString(el);

            if (day !== null) {
                picksIntervals.days.push(day);
            } else if (typeof +el === "number") {
                picksIntervals.weeks.push(+el);
            }

            picksIntervals.days.sort();
        });

        return picksIntervals;
    }

    public getMatchingContainerFromDB = async (stationCode: string, trashType: number, model: PostgresModel) => {
        return await model.findOne({
            attributes: [
                "id",
                "station_code",
                "code",
                "trash_type",
                "cleaning_frequency_frequency",
                "cleaning_frequency_interval",
                "pick_days",
            ],
            raw: true,
            where: {
                station_code: stationCode,
                trash_type: trashType,
            },
        });
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
                        cleaning_frequency_interval: (container?.cleaning_frequency || 0) % 10,
                        cleaning_frequency_frequency: Math.floor((container?.cleaning_frequency || 0) / 10),
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
                    cleaning_frequency_interval: Math.floor(container?.cleaningFrequency?.code / 10),
                    cleaning_frequency_frequency: container?.cleaningFrequency?.code  % 10,
                    company: null,
                    container_type: container?.container?.name,
                    trash_type: this.iprTransformation.getTrashTypeByString(container?.trashType?.code).id ||
                        this.iprTransformation.getTrashTypeByString(container?.trashType?.name).id,
                    source: "ksnko",
                    sensor_id: null,
                });
            });
        });

        return stationsByCode;
    }

    public getAttachedDettachedContainers = (
        storedContainers: any[],
        newMonitoredContainers: any[],
    ): {
        attached: Array<{
            knsko_id: number;
            sensor_id: number;
        }>,
        detached: Array<{
            knsko_id: number;
            sensor_id: number;
        }>,
    } => {
        const normalizedStored = {};
        const normalizedNew = {};

        const attached: Array<{
            knsko_id: number;
            sensor_id: number;
        }> = [];

        const detached: Array<{
            knsko_id: number;
            sensor_id: number;
        }> = [];

        for (const storedContainer of storedContainers) {
            normalizedStored[storedContainer.knsko_id] = storedContainer.sensor_id;
        }

        for (const newContainer of newMonitoredContainers) {
            if (newContainer.extern_id) {
                normalizedNew[newContainer.extern_id] = newContainer.id;
            }
        }

        for (const storedContainer of storedContainers) {
            // sensor removed || changed
            if (
                storedContainer.knsko_id &&
                !normalizedNew[storedContainer.knsko_id]
            ) {
                detached.push({
                    knsko_id: storedContainer.knsko_id,
                    sensor_id: normalizedStored[storedContainer.knsko_id],
                });
            }

            if (
                storedContainer.knsko_id &&
                normalizedNew[storedContainer.knsko_id] &&
                (
                `${normalizedNew[storedContainer.knsko_id]}` !== `${normalizedStored[storedContainer.knsko_id]}`
                )
            ) {
                attached.push({
                    knsko_id: storedContainer.knsko_id,
                    sensor_id: normalizedNew[storedContainer.knsko_id],
                });
                detached.push({
                    knsko_id: storedContainer.knsko_id,
                    sensor_id: normalizedStored[storedContainer.knsko_id],
                });
            }
        }

        for (const newContainer of newMonitoredContainers) {
            if (
                newContainer.extern_id &&
                !normalizedStored[newContainer.extern_id]
            ) {
                attached.push({
                    knsko_id: newContainer.id,
                    sensor_id: normalizedNew[newContainer.extern_id],
                });
            }
        }

        return {
            attached,
            detached,
        };
    }

    public getSensorContainersByStationCode = (
        containers: any,
        stationsByCode: any,
        ): any => {
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
                if (`${container.extern_id}` === `${storedContainer.knsko_id}`) {
                    storedContainer.code = container.code;
                    storedContainer.id = getUuid(container.code);
                    storedContainer.station_code = storedContainer.station_code || this.getStationCode(container.code);
                    storedContainer.total_volume = container.total_volume;
                    storedContainer.trash_type = storedContainer.trash_type || trashType;
                    storedContainer.prediction = container.prediction;
                    storedContainer.bin_type = storedContainer.bin_type || container.bin_type;
                    storedContainer.installed_at = container.installed_at;
                    storedContainer.network = container.network;
                    storedContainer.source = "sensoneo",
                    storedContainer.sensor_id = container.id || null;
                    containerUpdated = true;
                    break;
                }
            }

            // should we add new - only in sensoneo not in ksnko ?
            if (!containerUpdated && container.extern_id) {
                stationsByCode[station_code].containers.push({
                    id: getUuid(container.code),
                    knsko_id: +container.extern_id || null,
                    knsko_code: container.code,
                    trash_type: trashType,
                    code: container.code,
                    station_code: this.getStationCode(container.code),
                    total_volume: container.total_volume,
                    prediction: container.prediction,
                    bin_type: container.bin_type,
                    installed_at: container.installed_at,
                    network: container.network,
                    source: "sensoneo",
                    sensor_id: container.id || null,
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
