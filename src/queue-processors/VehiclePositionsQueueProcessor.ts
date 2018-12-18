"use strict";

import * as amqplib from "amqplib";
import { VehiclePositions } from "data-platform-schema-definitions";
import handleError from "../helpers/errors/ErrorHandler";
import VehiclePositionsWorker from "../workers/VehiclePositionsWorker";
import BaseQueueProcessor from "./BaseQueueProcessor";

const log = require("debug")("data-platform:integration-engine:queue");
const config = require("../config/ConfigLoader");

export default class VehiclePositionsQueueProcessor extends BaseQueueProcessor {

    private queuePrefix: string;

    constructor(channel: amqplib.Channel) {
        super(channel);
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + VehiclePositions.name.toLowerCase();
    }

    public registerQueues = async (): Promise<any> => {
        await this.registerQueue(this.queuePrefix + ".saveDataToDB",
            "*." + this.queuePrefix + ".saveDataToDB", this.saveDataToDB);
    }

    protected saveDataToDB = async (msg: any): Promise<any> => {
        try {
            const worker = new VehiclePositionsWorker();
            log(" [>] " + this.queuePrefix + ".saveDataToDB received some data.");
            const res = await worker.saveDataToDB(JSON.parse(msg.content.toString()).m.spoj);

            this.channel.ack(msg);
            log(" [<] " + this.queuePrefix + ".saveDataToDB: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg);
        }
    }

}
