"use strict";

import * as amqplib from "amqplib";
import { IceGatewayStreetLamps } from "data-platform-schema-definitions";
import handleError from "../helpers/errors/ErrorHandler";
import log from "../helpers/Logger";
import IceGatewayStreetLampsWorker from "../workers/IceGatewayStreetLampsWorker";
import BaseQueueProcessor from "./BaseQueueProcessor";

const config = require("../config/ConfigLoader");

export default class IceGatewayStreetLampsQueueProcessor extends BaseQueueProcessor {

    private queuePrefix: string;

    constructor(channel: amqplib.Channel) {
        super(channel);
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + IceGatewayStreetLamps.name.toLowerCase();
    }

    public registerQueues = async (): Promise<void> => {
        await this.registerQueue(this.queuePrefix + ".refreshDataInDB",
            "*." + this.queuePrefix + ".refreshDataInDB", this.refreshDataInDB, {
                deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                deadLetterRoutingKey: "dead",
                messageTtl: 14 * 60 * 1000 });
        await this.registerQueue(this.queuePrefix + ".setDimValue",
            "*." + this.queuePrefix + ".setDimValue", this.setDimValue, {
                deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                deadLetterRoutingKey: "dead" });
    }

    protected refreshDataInDB = async (msg: any): Promise<void> => {
        try {
            const igstreetLampsWorker = new IceGatewayStreetLampsWorker();
            log.debug(" [>] " + this.queuePrefix + ".refreshDataInDB received some data.");
            await igstreetLampsWorker.refreshDataInDB();

            this.channel.ack(msg);
            log.debug(" [<] " + this.queuePrefix + ".refreshDataInDB: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg, false, false);
        }
    }

    protected setDimValue = async (msg: any): Promise<void> => {
        try {
            const igstreetLampsWorker = new IceGatewayStreetLampsWorker();
            log.debug(" [>] " + this.queuePrefix + ".setDimValue received some data.");
            await igstreetLampsWorker.setDimValue(JSON.parse(msg.content.toString()));

            this.channel.ack(msg);
            log.debug(" [<] " + this.queuePrefix + ".setDimValue: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg, false, false);
        }
    }

}
