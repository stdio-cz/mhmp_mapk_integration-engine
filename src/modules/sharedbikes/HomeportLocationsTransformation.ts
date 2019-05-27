"use strict";

import { SharedBikes } from "golemio-schema-definitions";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, JSONDataTypeStrategy } from "../../core/datasources";
import { log, Validator } from "../../core/helpers";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class HomeportLocationsTransformation extends BaseTransformation implements ITransformation {

    public name: string;
    private settingsDatasource: DataSource;
    private batteryRangeCorrection: number;

    constructor() {
        super();
        this.name = SharedBikes.homeport.name + "Locations";
        this.settingsDatasource = new DataSource(SharedBikes.homeport.name + "SetDataSource",
            new HTTPProtocolStrategy({
                headers: {},
                method: "GET",
                strictSSL: false,
                url: config.datasources.HomeportSettingsSharedBikes,
            }),
            new JSONDataTypeStrategy({resultsPath: "data.Map"}),
            new Validator(SharedBikes.homeport.name + "SetDataSource",
                SharedBikes.homeport.settingDatasourceMongooseSchemaObject));
        this.batteryRangeCorrection = 0;
    }

    public transform = async (data: any): Promise<any> => {
        this.batteryRangeCorrection = await this.getBatteryRangeCorrection();

        return new Promise((resolve, reject) => {

            const results = [];

            // locations JS Closures
            const locationsIterator = (i, icb) => {
                if (data.length === i) {
                    return icb();
                }
                const coordinates = [ data[i].Longitude, data[i].Latitude ];

                if (data[i].AvailableExternalBikes.length > 0) {
                    bikesIterator(0, data[i].AvailableExternalBikes, coordinates, () => {
                        setImmediate(locationsIterator.bind(null, i + 1, icb));
                    });
                } else if (data[i].Stations.length > 0) {
                    stationsIterator(0, data[i].Stations, coordinates, () => {
                        setImmediate(locationsIterator.bind(null, i + 1, icb));
                    });
                } else {
                    setImmediate(locationsIterator.bind(null, i + 1, icb));
                }
            };

            // stations JS Closures
            const stationsIterator = (i, stations, coordinates, icb) => {
                if (stations.length === i) {
                    return icb();
                }

                if (stations[i].AvailableBikes.length > 0) {
                    bikesIterator(0, stations[i].AvailableBikes, coordinates, () => {
                        setImmediate(stationsIterator.bind(null, i + 1, stations, coordinates, icb));
                    });
                } else {
                    setImmediate(stationsIterator.bind(null, i + 1, stations, coordinates, icb));
                }
            };

            // bikes JS Closures
            const bikesIterator = async (i, bikes, coordinates, icb) => {
                if (bikes.length === i) {
                    return icb();
                }

                results.push(await this.transformElement({
                    ...bikes[i],
                    Latitude: coordinates[1],
                    Longitude: coordinates[0],
                    inRack: true,
                }));
                setImmediate(bikesIterator.bind(null, i + 1, bikes, coordinates, icb));
            };

            locationsIterator(0, () => {
                resolve(results);
            });

        });
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            geometry: {
                coordinates: [ parseFloat(element.Longitude), parseFloat(element.Latitude) ],
                type: "Point",
            },
            properties: {
                company: {
                    name: "HOMEPORT",
                    web: "prague.freebike.com",
                },
                estimated_trip_length_in_km: (element.Battery && this.batteryRangeCorrection)
                    ? Math.round((
                        (element.Battery - this.batteryRangeCorrection) *
                        (100 / (100 - this.batteryRangeCorrection))
                      ))
                    : null,
                id: "homeport-" + element.BikeIdentifier,
                in_rack: (element.inRack) ? element.inRack : false,
                label: "",
                location_note: null,
                name: (element.BikeIdentifier) ? element.BikeIdentifier : "homeport-" + element.BikeID,
                res_url: "https://freebike.app.link?bikeId=" + element.BikeIdentifier + "&system=praha",
                type: (element.IsEBike)
                    ? { description: "ebike", id: 2 }
                    : { description: "bike", id: 1 },
                updated_at: new Date().getTime(),
            },
            type: "Feature",
        };
        return res;
    }

    private getBatteryRangeCorrection = async (): Promise<any> => {
        // TODO pouzit redis
        try {
            const data = await this.settingsDatasource.getAll();
            if (!data.FreebikeBatteryRangeCorrection) {
                throw new Error("Homeport BatteryCorrection not found.");
            }
            return data.FreebikeBatteryRangeCorrection;
        } catch (err) {
            log.error("Homeport getting setting failed.");
            log.error(err);
            return 0;
        }
    }

}
