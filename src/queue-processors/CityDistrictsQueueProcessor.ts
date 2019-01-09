"use strict";

import * as amqplib from "amqplib";
import { CityDistricts } from "data-platform-schema-definitions";
import handleError from "../helpers/errors/ErrorHandler";
import CityDistrictsWorker from "../workers/CityDistrictsWorker";
import BaseQueueProcessor from "./BaseQueueProcessor";

const log = require("debug")("data-platform:integration-engine:queue");
const config = require("../config/ConfigLoader");

export default class CityDistrictsQueueProcessor extends BaseQueueProcessor {

    private queuePrefix: string;

    constructor(channel: amqplib.Channel) {
        super(channel);
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + CityDistricts.name.toLowerCase();
    }

    public registerQueues = async (): Promise<void> => {
        await this.registerQueue(this.queuePrefix + ".refreshDataInDB",
            "*." + this.queuePrefix + ".refreshDataInDB", this.refreshDataInDB, {
                deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                deadLetterRoutingKey: "dead",
                messageTtl: 15 * 24 * 60 * 60 * 1000 });
    }

    protected refreshDataInDB = async (msg: any): Promise<void> => {
        try {
            const cityDistrictsWorker = new CityDistrictsWorker();
            log(" [>] " + this.queuePrefix + ".refreshDataInDB received some data.");
            await cityDistrictsWorker.refreshDataInDB();

            this.channel.ack(msg);
            log(" [<] " + this.queuePrefix + ".refreshDataInDB: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg, false, false);
        }
    }

}
