"use strict";

import { WazeCCP } from "@golemio/schema-definitions";
import moment = require("moment");
import { log } from "../../core/helpers";
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
        const downloadedAt = data.downloadedAt;

        if (!data.alerts) {
            log.warn(`${this.name}: Data source returned empty data.`);
            return [];
        }

        const results = [];
        data.alerts.forEach((element) => {
            const res = this.transformElement({
                ...element,
                downloadedAt,
                rootStart,
            });
            if (res) {
                results.push(res);
            }
        });
        return results;
    }

    protected transformElement = (alert: any): any => {
        const rootStart = alert.rootStart;
        delete alert.rootStart;
        const downloadedAt = alert.downloadedAt;
        delete alert.downloadedAt;
        const alertHash = generateAJIUniqueIdentifierHash(alert, rootStart);

        const res = {
            city: alert.city,
            confidence: alert.confidence,
            country: alert.country,
            id: alertHash,
            jam_uuid: alert.jamUuid,
            location: alert.location,
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

            // TODO add downloadedAt timestamp
            downloaded_at: downloadedAt,
        };

        return res;
    }
}
