"use strict";

import { WazeCCP } from "@golemio/schema-definitions";
import moment = require("moment");
import { log } from "../../core/helpers";
import { BaseTransformation, ITransformation } from "../../core/transformations";
import { generateAJIUniqueIdentifierHash } from "./";

export class WazeCCPJamsTransformation extends BaseTransformation
    implements ITransformation {
    public name: string;

    constructor() {
        super();
        this.name = WazeCCP.jams.name;
    }

    /**
     * Transform the whole collection or one single element
     */
    public transform = async (data: any | any[]): Promise<any | any[]> => {
        const rootStart = data.startTimeMillis;
        const downloadedAt = data.downloadedAt;

        if (!data.jams) {
            log.warn(`${this.name}: Data source returned empty data.`);
            return [];
        }

        const results = [];
        data.jams.forEach((element) => {
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

    protected transformElement = (jam: any): any => {
        const rootStart = jam.rootStart;
        delete jam.rootStart;
        const downloadedAt = jam.downloadedAt;
        delete jam.downloadedAt;
        const jamHash = generateAJIUniqueIdentifierHash(jam, rootStart);

        const res = {
            blocking_alert_id: jam.blockingAlertUuid,
            city: jam.city,
            country: jam.country,
            delay: jam.delay,
            end_node: jam.endNode,
            id: jamHash,
            length: jam.length,
            level: jam.level,
            line: jam.line,
            pub_millis: jam.pubMillis,
            pub_utc_date: moment.utc(jam.pubMillis).toDate(),
            road_type: jam.roadType,
            speed: jam.speed,
            speed_kmh: jam.speedKMH,
            start_node: jam.startNode,
            street: jam.street,
            turn_line: jam.turnLine,
            turn_type: jam.turnType,
            type: jam.type,
            uuid: jam.uuid,

            // TODO add downloadedAt timestamp
            downloaded_at: downloadedAt,
        };

        return res;
    }
}
