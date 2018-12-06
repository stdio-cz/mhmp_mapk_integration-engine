"use strict";

import * as amqplib from "amqplib";
import handleError from "../helpers/errors/ErrorHandler";
import VehiclePositionsWorker from "../workers/VehiclePositionsWorker";
import BaseQueueProcessor from "./BaseQueueProcessor";

const log = require("debug")("data-platform:integration-engine");

export default class VehiclePositionsQueueProcessor extends BaseQueueProcessor {

    constructor(channel: amqplib.Channel) {
        super(channel);
    }

    public registerQueues = async (): Promise<any> => {
        await this.registerQueue("vehicle-positions-saveDataToDB",
            "*.vehicle-positions.saveDataToDB", this.saveDataToDB);
    }

    protected saveDataToDB = async (msg: any): Promise<any> => {
        try {
            const worker = new VehiclePositionsWorker();
            log(" [>] vehicle-positions-saveDataToDB received some data.");
            const res = await worker.saveDataToDB(JSON.parse(msg.content.toString()).m.spoj);

            this.channel.ack(msg);
            log(" [<] vehicle-positions-saveDataToDB: done");
        } catch (err) {
            handleError(err);
            this.channel.ack(msg);
        }
    }

}
