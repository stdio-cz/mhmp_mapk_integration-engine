"use strict";

import * as amqplib from "amqplib";
import handleError from "../helpers/errors/ErrorHandler";
import IGSensorsWorker from "../workers/IGSensorsWorker";
import BaseQueueProcessor from "./BaseQueueProcessor";

const log = require("debug")("data-platform:integration-engine:queue");
const config = require("../config/ConfigLoader");

export default class IGSensorsQueueProcessor extends BaseQueueProcessor {

    private queuePrefix: string;

    constructor(channel: amqplib.Channel) {
        super(channel);
        // TODO brat jmeno ze schemat?
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + "IGSensors";
    }

    public registerQueues = async (): Promise<any> => {
        await this.registerQueue(this.queuePrefix + ".refreshDataInDB",
            "*." + this.queuePrefix + ".refreshDataInDB", this.refreshDataInDB);
        await this.registerQueue(this.queuePrefix + ".saveDataToHistory",
            "*." + this.queuePrefix + ".saveDataToHistory", this.saveDataToHistory);
    }

    protected refreshDataInDB = async (msg: any): Promise<void> => {
        try {
            const igsensorsWorker = new IGSensorsWorker();
            log(" [>] " + this.queuePrefix + ".refreshDataInDB received some data.");
            const res = await igsensorsWorker.refreshDataInDB();

            // historization
            await this.sendMessageToExchange("workers." + this.queuePrefix + ".saveDataToHistory",
                JSON.stringify(res.features));

            this.channel.ack(msg);
            log(" [<] " + this.queuePrefix + ".refreshDataInDB: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg);
        }
    }

    protected saveDataToHistory = async (msg: any): Promise<void> => {
        try {
            const igsensorsWorker = new IGSensorsWorker();
            log(" [>] " + this.queuePrefix + ".saveDataToHistory received some data.");
            await igsensorsWorker.saveDataToHistory(JSON.parse(msg.content.toString()));

            this.channel.ack(msg);
            log(" [<] " + this.queuePrefix + ".saveDataToHistory: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg);
        }
    }

}
