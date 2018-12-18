"use strict";

import * as amqplib from "amqplib";
import { IceGatewaySensors } from "data-platform-schema-definitions";
import handleError from "../helpers/errors/ErrorHandler";
import IceGatewaySensorsWorker from "../workers/IceGatewaySensorsWorker";
import BaseQueueProcessor from "./BaseQueueProcessor";

const log = require("debug")("data-platform:integration-engine:queue");
const config = require("../config/ConfigLoader");

export default class IceGatewaySensorsQueueProcessor extends BaseQueueProcessor {

    private queuePrefix: string;

    constructor(channel: amqplib.Channel) {
        super(channel);
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + IceGatewaySensors.name.toLowerCase();
    }

    public registerQueues = async (): Promise<any> => {
        await this.registerQueue(this.queuePrefix + ".refreshDataInDB",
            "*." + this.queuePrefix + ".refreshDataInDB", this.refreshDataInDB);
        await this.registerQueue(this.queuePrefix + ".saveDataToHistory",
            "*." + this.queuePrefix + ".saveDataToHistory", this.saveDataToHistory);
    }

    protected refreshDataInDB = async (msg: any): Promise<void> => {
        try {
            const worker = new IceGatewaySensorsWorker();
            log(" [>] " + this.queuePrefix + ".refreshDataInDB received some data.");
            const res = await worker.refreshDataInDB();

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
            const worker = new IceGatewaySensorsWorker();
            log(" [>] " + this.queuePrefix + ".saveDataToHistory received some data.");
            await worker.saveDataToHistory(JSON.parse(msg.content.toString()));

            this.channel.ack(msg);
            log(" [<] " + this.queuePrefix + ".saveDataToHistory: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg);
        }
    }

}
