"use strict";

import { SharedBikes } from "golemio-schema-definitions";
import { Validator } from "golemio-validator";
import { config } from "../../core/config";
import { DataSource, HTTPProtocolStrategy, JSONDataTypeStrategy } from "../../core/datasources";
import { log } from "../../core/helpers";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class HomeportOutOfLocationsTransformation extends BaseTransformation implements ITransformation {

    public name: string;
    private settingsDatasource: DataSource;
    private batteryRangeCorrection: number;

    constructor() {
        super();
        this.name = SharedBikes.homeport.name + "OutOfLocations";
        this.settingsDatasource = new DataSource(SharedBikes.homeport.name + "SetDataSource",
            new HTTPProtocolStrategy({
                headers: {},
                method: "GET",
                strictSSL: false,
                url: config.datasources.HomeportSettingsSharedBikes,
            }),
            new JSONDataTypeStrategy({ resultsPath: "data.Map" }),
            new Validator(SharedBikes.homeport.name + "SetDataSource",
                SharedBikes.homeport.settingDatasourceMongooseSchemaObject));
        this.batteryRangeCorrection = 0;
    }

    public transform = async (data: any): Promise<any> => {
        this.batteryRangeCorrection = await this.getBatteryRangeCorrection();

        if (data instanceof Array) {
            const promises = data.map((element) => {
                return this.transformElement(element);
            });
            const results = await Promise.all(promises);
            return results.filter((r) => r);
        } else {
            return this.transformElement(data);
        }
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            geometry: {
                coordinates: [parseFloat(element.Longitude), parseFloat(element.Latitude)],
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
