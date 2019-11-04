"use strict";

import { MunicipalAuthorities } from "@golemio/schema-definitions";
import * as moment from "moment-timezone";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class SkodaPalaceQueuesTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = MunicipalAuthorities.skodaPalaceQueues.name;
    }

    /**
     * Overrides BaseTransformation::transformHistory
     */
    public transformHistory = async (data: any | any[]): Promise<any | any[]> => {
        const promises = data.served_activities.map(async (activity) => {
            return {
                activity: activity.activity,
                last_updated: new Date(data.last_updated).getTime(),
                municipal_authority_id: data.municipal_authority_id,
                number_of_person_in_queue: activity.number_of_person_in_queue,
                number_of_serving_counters: activity.number_of_serving_counters,
                updated_at: data.updated_at,
            };
        });
        const results = await Promise.all(promises);
        return results.filter((r) => r);
    }

    protected transformElement = async (element: any): Promise<any> => {
        const [date, time] = element.div[1].div._.replace("Stav ke dni ", "").replace(" hod.", "").split(" v ");
        const dateSplited = date.split(".");

        const lastUpdated = moment.tz("Europe/Prague");
        lastUpdated.year(parseInt(dateSplited[2], 10));
        lastUpdated.month(parseInt(dateSplited[1], 10) - 1);
        lastUpdated.date(parseInt(dateSplited[0], 10));
        lastUpdated.hour(parseInt(time, 10));
        lastUpdated.minute(parseInt(element.div[1].div.sup.small, 10));
        lastUpdated.second(0);
        lastUpdated.millisecond(0);

        const res = {
            last_updated: lastUpdated.valueOf(),
            municipal_authority_id: "skoduv-palac",
            served_activities: [],
            title: "Monitoring odbavování klientů ve Škodově paláci",
            updated_at: new Date().getTime(),
        };

        const activities = element.table.tbody.tr.map(async (activity) => {
            if (activity.td[0].b && activity.td[0].b !== "") {
                return {
                    activity: activity.td[0].b,
                    number_of_person_in_queue: parseInt(activity.td[1].div.span.replace("osob", ""), 10),
                    number_of_serving_counters: parseInt(activity.td[2], 10),
                };
            } else {
                return undefined;
            }
        });
        res.served_activities = await Promise.all(activities);
        res.served_activities = res.served_activities.filter((item) => item);

        return res;
    }

}