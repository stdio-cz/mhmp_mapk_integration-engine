"use strict";

import { BicycleCounters } from "@golemio/schema-definitions";
import * as moment from "moment-timezone";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class CameaMeasurementsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = BicycleCounters.camea.name + "Measurements";
    }

    /**
     * Overrides BaseTransformation::transform
     */
    public transform = async (data: any | any[]): Promise<{detections: any[], temperatures: any[]}> => {
        const res = {
            detections: [],
            temperatures: [],
        };

        if (data instanceof Array) {
            const promises = data.map(async (element, i) => {
                const elemRes = await this.transformElement(element);
                if (elemRes) {
                    res.detections = res.detections.concat(elemRes.detections);
                    if (elemRes.temperature) {
                        res.temperatures.push(elemRes.temperature);
                    }
                }
                return;
            });
            await Promise.all(promises);
            return res;
        } else {
            const elemRes = await this.transformElement(data);
            if (elemRes) {
                res.detections = res.detections.concat(elemRes.detections);
                if (elemRes.temperature) {
                    res.temperatures.push(elemRes.temperature);
                }
        }
            return res;
        }
    }

    protected transformElement = async (element: any): Promise<any> => {
        const measuredFrom = moment.tz(element.datetime, "Europe/Prague");
        const measuredTo = measuredFrom.clone().add(5, "minutes");

        const res = {
            detections: element.directions
                ? element.directions.map((direction) => ({
                    directions_id: "camea-" + direction.id,
                    locations_id: "camea-" + element.bikecounter,
                    measured_from: measuredFrom.valueOf(),
                    measured_to: measuredTo.valueOf(),
                    value: direction.detections,
                    value_pedestrians: direction.pedestrians,
                }))
                : [],
            temperature: !isNaN(parseFloat(element.temperature))
                ? {
                    locations_id: "camea-" + element.bikecounter,
                    measured_from: measuredFrom.valueOf(),
                    measured_to: measuredTo.valueOf(),
                    value: parseInt(element.temperature, 10),
                }
                : null,
        };

        return res;
    }

}
