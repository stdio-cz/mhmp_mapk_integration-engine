"use strict";

import * as amqplib from "amqplib";
import handleError from "../helpers/errors/ErrorHandler";
import CityDistrictsWorker from "../workers/CityDistrictsWorker";
import BaseQueueProcessor from "./BaseQueueProcessor";

const log = require("debug")("data-platform:integration-engine");

export default class CityDistrictsQueueProcessor extends BaseQueueProcessor {

    constructor(channel: amqplib.Channel) {
        super(channel);
    }

    public registerQueues = async (): Promise<any> => {
        await this.registerQueue("city-districts-refreshDataInDB",
            "*.city-districts.refreshDataInDB", this.refreshDataInDB);
    }

    protected refreshDataInDB = async (msg: any): Promise<any> => {
        try {
            const cityDistrictsWorker = new CityDistrictsWorker();
            log(" [>] city-districts-refreshDataInDB received some data.");
            const res = await cityDistrictsWorker.refreshDataInDB();

            this.channel.ack(msg);
            log(" [<] city-districts-refreshDataInDB: done");
        } catch (err) {
            handleError(err);
            this.channel.ack(msg);
        }
    }

}
