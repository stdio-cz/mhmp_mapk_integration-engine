"use strict";

import * as amqplib from "amqplib";
import handleError from "../helpers/errors/ErrorHandler";
import CityDistrictsWorker from "../workers/CityDistrictsWorker";
import BaseQueueProcessor from "./BaseQueueProcessor";

const log = require("debug")("data-platform:integration-engine:queue");
const config = require("../config/ConfigLoader");

export default class CityDistrictsQueueProcessor extends BaseQueueProcessor {

    private queuePrefix: string;

    constructor(channel: amqplib.Channel) {
        super(channel);
        // TODO brat jmeno ze schemat?
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + "CityDistricts";
    }

    public registerQueues = async (): Promise<any> => {
        await this.registerQueue(this.queuePrefix + ".refreshDataInDB",
            "*." + this.queuePrefix + ".refreshDataInDB", this.refreshDataInDB);
    }

    protected refreshDataInDB = async (msg: any): Promise<any> => {
        try {
            const cityDistrictsWorker = new CityDistrictsWorker();
            log(" [>] " + this.queuePrefix + ".refreshDataInDB received some data.");
            const res = await cityDistrictsWorker.refreshDataInDB();

            this.channel.ack(msg);
            log(" [<] " + this.queuePrefix + ".refreshDataInDB: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg);
        }
    }

}
