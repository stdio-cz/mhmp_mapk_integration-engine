"use strict";

import { BicycleCounters } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class ApiLogsFailuresTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = BicycleCounters.apiLogsFailures.name;
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
            error_code: element.error_code,
            id: element.id,
            issue: element.issue,
            measured_at: element.created_at,
            ping: element.ping,
        };
    }
}
