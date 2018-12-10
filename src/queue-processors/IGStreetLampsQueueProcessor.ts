"use strict";

import * as amqplib from "amqplib";
import handleError from "../helpers/errors/ErrorHandler";
import IGStreetLampsWorker from "../workers/IGStreetLampsWorker";
import BaseQueueProcessor from "./BaseQueueProcessor";

const log = require("debug")("data-platform:integration-engine");

export default class IGStreetLampsQueueProcessor extends BaseQueueProcessor {

    constructor(channel: amqplib.Channel) {
        super(channel);
    }

    public registerQueues = async (): Promise<any> => {
        await this.registerQueue("igstreet-lamps-refreshDataInDB",
            "*.igstreet-lamps.refreshDataInDB", this.refreshDataInDB);
    }

    protected refreshDataInDB = async (msg: any): Promise<void> => {
        try {
            const igstreetLampsWorker = new IGStreetLampsWorker();
            log(" [>] igstreet-lamps-refreshDataInDB received some data.");
            const res = await igstreetLampsWorker.refreshDataInDB();

            this.channel.ack(msg);
            log(" [<] igstreet-lamps-refreshDataInDB: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg);
        }
    }

}
