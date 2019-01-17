"use strict";

import * as amqplib from "amqplib";
import { IceGatewaySensors } from "data-platform-schema-definitions";
import handleError from "../helpers/errors/ErrorHandler";
import log from "../helpers/Logger";
import IceGatewaySensorsWorker from "../workers/IceGatewaySensorsWorker";
import BaseQueueProcessor from "./BaseQueueProcessor";

const config = require("../config/ConfigLoader");

export default class IceGatewaySensorsQueueProcessor extends BaseQueueProcessor {

    private queuePrefix: string;

    constructor(channel: amqplib.Channel) {
        super(channel);
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + IceGatewaySensors.name.toLowerCase();
    }

    public registerQueues = async (): Promise<void> => {
        await this.registerQueue(this.queuePrefix + ".refreshDataInDB",
            "*." + this.queuePrefix + ".refreshDataInDB", this.refreshDataInDB, {
                deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                deadLetterRoutingKey: "dead",
                messageTtl: 4 * 60 * 1000 });
        await this.registerQueue(this.queuePrefix + ".saveDataToHistory",
            "*." + this.queuePrefix + ".saveDataToHistory", this.saveDataToHistory, {
                deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                deadLetterRoutingKey: "dead"});
    }

    protected refreshDataInDB = async (msg: any): Promise<void> => {
        try {
            const worker = new IceGatewaySensorsWorker();
            log.debug(" [>] " + this.queuePrefix + ".refreshDataInDB received some data.");
            await worker.refreshDataInDB();

            this.channel.ack(msg);
            log.debug(" [<] " + this.queuePrefix + ".refreshDataInDB: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg, false, false);
        }
    }

    protected saveDataToHistory = async (msg: any): Promise<void> => {
        try {
            const worker = new IceGatewaySensorsWorker();
            log.debug(" [>] " + this.queuePrefix + ".saveDataToHistory received some data.");
            await worker.saveDataToHistory(JSON.parse(msg.content.toString()));

            this.channel.ack(msg);
            log.debug(" [<] " + this.queuePrefix + ".saveDataToHistory: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg, false, false);
        }
    }

}
