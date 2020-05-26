"use strict";

import { WazeCCP } from "@golemio/schema-definitions";
import moment = require("moment");
import { log } from "../../core/helpers";
import { BaseTransformation, ITransformation } from "../../core/transformations";
import { generateAJIUniqueIdentifierHash } from "./";

export class WazeCCPIrregularitiesTransformation extends BaseTransformation
    implements ITransformation {
    public name: string;

    constructor() {
        super();
        this.name = WazeCCP.irregularities.name;
    }

    /**
     * Transform the whole collection or one single element
     */
    public transform = async (data: any | any[]): Promise<any | any[]> => {
        const rootStart = data.startTimeMillis;
        const downloadedAt = data.downloadedAt;

        if (!data.irregularities) {
            log.warn(`${this.name}: Data source returned empty data.`);
            return [];
        }

        const results = [];
        data.irregularities.forEach((element) => {
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

    protected transformElement = (irregularity: any): any => {
        const rootStart = irregularity.rootStart;
        delete irregularity.rootStart;
        const downloadedAt = irregularity.downloadedAt;
        delete irregularity.downloadedAt;
        const irregularityHash = generateAJIUniqueIdentifierHash(irregularity, rootStart);

        const res = {
            alerts_count: irregularity.alertsCount,
            cause_type: irregularity.causeType,
            city: irregularity.city,
            country: irregularity.country,
            delay_seconds: irregularity.delaySeconds,
            detection_date: irregularity.detectionDate,
            detection_date_millis: irregularity.detectionDateMillis,
            detection_utc_date: moment.utc(irregularity.detectionDateMillis).toDate(),
            drivers_count: irregularity.driversCount,
            end_node: irregularity.endNode,
            id: irregularityHash,
            is_highway: irregularity.highway,
            jam_level: irregularity.jamLevel,
            length: irregularity.length,
            line: irregularity.line,
            n_comments: irregularity.nComments,
            n_images: irregularity.nImages,
            n_thumbs_up: irregularity.nThumbsUp,
            regular_speed: irregularity.regularSpeed,
            seconds: irregularity.seconds,
            severity: irregularity.severity,
            speed: irregularity.speed,
            start_node: irregularity.startNode,
            street: irregularity.street,
            trend: irregularity.trend,
            type: irregularity.type,
            update_date: irregularity.updateDate,
            update_date_millis: irregularity.updateDateMillis,
            update_utc_date: moment.utc(irregularity.updateDateMillis).toDate(),
            uuid: irregularity.id,

            // TODO add downloadedAt timestamp
            downloaded_at: downloadedAt,
        };

        return res;
    }
}
