"use strict";

import { WazeCCP } from "@golemio/schema-definitions";
import moment = require("moment");
import { BaseTransformation, ITransformation } from "../../core/transformations";
import { generateAJIUniqueIdentifierHash } from "./";

export class WazeCCPAlertsTransformation extends BaseTransformation
    implements ITransformation {
    public name: string;

    constructor() {
        super();
        this.name = WazeCCP.alerts.name;
    }

    /**
     * Transform the whole collection or one single element
     */
    public transform = async (data: any | any[]): Promise<any | any[]> => {
        const rootStart = data.startTimeMillis;

        const promises = data.alerts.map((element) => {
            element.rootStart = rootStart;
            return this.transformElement(element);
        });
        const results = await Promise.all(promises);
        return results.filter((r) => r);
    }

    protected transformElement = async (alert: any): Promise<any> => {
        const rootStart = alert.rootStart;
        delete alert.rootStart;
        const alertHash = generateAJIUniqueIdentifierHash(alert, rootStart);

        const res = {
            city: alert.city,
            confidence: alert.confidence,
            country: alert.country,
            id: alertHash,
            jam_uuid: alert.jamUuid,
            location: JSON.stringify(alert.location),
            magvar: alert.magvar,
            pub_millis: alert.pubMillis,
            pub_utc_date: moment.utc(alert.pubMillis).toDate(),
            reliability: alert.reliability,
            report_by_municipality_user: alert.reportByMunicipalityUser,
            report_description: alert.reportDescription,
            report_rating: alert.reportRating,
            road_type: alert.roadType,
            street: alert.street,
            subtype: alert.subtype,
            thumbs_up: alert.nThumbsUp,
            type: alert.type,
            uuid: alert.uuid,
        };

        return res;
    }
}
