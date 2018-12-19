"use strict";

import * as amqplib from "amqplib";
import { IceGatewayStreetLamps } from "data-platform-schema-definitions";
import handleError from "../helpers/errors/ErrorHandler";
import IceGatewayStreetLampsWorker from "../workers/IceGatewayStreetLampsWorker";
import BaseQueueProcessor from "./BaseQueueProcessor";

const log = require("debug")("data-platform:integration-engine:queue");
const config = require("../config/ConfigLoader");

export default class IceGatewayStreetLampsQueueProcessor extends BaseQueueProcessor {

    private queuePrefix: string;

    constructor(channel: amqplib.Channel) {
        super(channel);
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + IceGatewayStreetLamps.name.toLowerCase();
    }

    public registerQueues = async (): Promise<any> => {
        await this.registerQueue(this.queuePrefix + ".refreshDataInDB",
            "*." + this.queuePrefix + ".refreshDataInDB", this.refreshDataInDB);
        await this.registerQueue(this.queuePrefix + ".setDimValue",
            "*." + this.queuePrefix + ".setDimValue", this.setDimValue);
    }

    protected refreshDataInDB = async (msg: any): Promise<void> => {
        try {
            const igstreetLampsWorker = new IceGatewayStreetLampsWorker();
            log(" [>] " + this.queuePrefix + ".refreshDataInDB received some data.");
            const res = await igstreetLampsWorker.refreshDataInDB();

            this.channel.ack(msg);
            log(" [<] " + this.queuePrefix + ".refreshDataInDB: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg);
        }
    }

    protected setDimValue = async (msg: any): Promise<void> => {
        try {
            const igstreetLampsWorker = new IceGatewayStreetLampsWorker();
            log(" [>] " + this.queuePrefix + ".setDimValue received some data.");
            const res = await igstreetLampsWorker.setDimValue(JSON.parse(msg.content.toString()));

            this.channel.ack(msg);
            log(" [<] " + this.queuePrefix + ".setDimValue: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg);
        }
    }

}
