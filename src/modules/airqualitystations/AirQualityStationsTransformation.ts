"use strict";

import { AirQualityStations } from "@golemio/schema-definitions";
import * as moment from "moment";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class AirQualityStationsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = AirQualityStations.name;
    }

    /**
     * Transform the whole collection or one single element
     */
    public transform = async (data: any | any[]): Promise<{indexes: any[], measurements: any[], stations: any[]}> => {
        const res = {
            indexes: [],
            measurements: [],
            stations: [],
        };

        data.States.forEach((state: any) => {
            const dateFrom = moment(state.DateFromUTC.replace("UTC", "+0000"), "YYYY-MM-DD HH:mm:ss.S ZZ");
            const dateTo = moment(state.DateToUTC.replace("UTC", "+0000"), "YYYY-MM-DD HH:mm:ss.S ZZ");

            if (state.Regions && Array.isArray(state.Regions)) {
                state.Regions.forEach((region: any) => {
                    if (region.Stations && Array.isArray(region.Stations)) {
                        region.Stations.forEach((station: any) => {
                            if (station.Code && station.Code !== "") {
                                // station identifier
                                const id = `${state.Code}_${region.Code}_${station.Code}`;

                                // stations
                                res.stations.push({
                                    classification: station.Classif,
                                    id,
                                    latitude: (station.Lat) ? parseFloat(station.Lat) : null,
                                    longitude: (station.Lon) ? parseFloat(station.Lon) : null,
                                    owner: station.Owner,
                                    region_code: region.Code,
                                    region_name: region.Name,
                                    state_code: state.Code,
                                    state_name: state.Name,
                                    station_name: station.Name,
                                    station_vendor_id: station.Code,
                                });

                                // indexes
                                if (station.Ix) {
                                    res.indexes.push({
                                        index_code: station.Ix,
                                        measured_from: dateFrom.valueOf(),
                                        measured_to: dateTo.valueOf(),
                                        station_id: id,
                                    });
                                }

                                // measurements
                                if (station.Components && Array.isArray(station.Components)) {
                                    station.Components.forEach((component: any) => {
                                        if ((component.Flag
                                                && (component.Flag === "ok" || component.Flag === "no_data"))
                                                || (component.Val && !component.Flag)) {
                                            res.measurements.push({
                                                aggregation_interval: component.Int,
                                                component_code: component.Code,
                                                measured_from: dateFrom.valueOf(),
                                                measured_to: dateTo.valueOf(),
                                                station_id: id,
                                                value: (component.Val) // Flag no_data
                                                    ? parseFloat(component.Val)
                                                    : null,
                                            });
                                        }
                                    });
                                }
                            }
                        });
                    }
                });
            }
        });

        return res;
    }

    protected transformElement = async (element: any): Promise<any> => {
        // Nothing to do.
        return;
    }

}
