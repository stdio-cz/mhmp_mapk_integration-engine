"use strict";

import * as amqplib from "amqplib";
import { VehiclePositions } from "data-platform-schema-definitions";
import handleError from "../helpers/errors/ErrorHandler";
import log from "../helpers/Logger";
import VehiclePositionsWorker from "../workers/VehiclePositionsWorker";
import BaseQueueProcessor from "./BaseQueueProcessor";

const config = require("../config/ConfigLoader");

export default class VehiclePositionsQueueProcessor extends BaseQueueProcessor {

    private queuePrefix: string;

    constructor(channel: amqplib.Channel) {
        super(channel);
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + VehiclePositions.name.toLowerCase();
    }

    public registerQueues = async (): Promise<void> => {
        await this.registerQueue(this.queuePrefix + ".saveDataToDB",
            "*." + this.queuePrefix + ".saveDataToDB", this.saveDataToDB, {
                deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                deadLetterRoutingKey: "dead" });
    }

    protected saveDataToDB = async (msg: any): Promise<void> => {
        try {
            const worker = new VehiclePositionsWorker();
            log.debug(" [>] " + this.queuePrefix + ".saveDataToDB received some data.");
            await worker.saveDataToDB(JSON.parse(msg.content.toString()).m.spoj);

            this.channel.ack(msg);
            log.debug(" [<] " + this.queuePrefix + ".saveDataToDB: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg, false, false);
        }
    }

}
