"use strict";

import { BicycleCounters } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class ApiLogsHitsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = BicycleCounters.apiLogsHits.name;
    }

    /**
     * Overrides BaseTransformation::transform
     */
    public transform = async (data: any | any[]): Promise<any[]> => {
        const res = [];
        if (data instanceof Array) {
            const promises = data.map(async (element) => {
                res.push(await this.transformElement(element));
                return;
            });

            await Promise.all(promises);
            return res;
        } else {
            return await this.transformElement(data);
        }
    }

    protected transformElement = async (element: any): Promise<any> => {
        return {
            id: element.id,
            latency: element.latency,
            measured_at: element.created_at,
            ping_time: element.ping_time,
        };
    }

}
