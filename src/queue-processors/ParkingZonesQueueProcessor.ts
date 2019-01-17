"use strict";

import * as amqplib from "amqplib";
import { ParkingZones } from "data-platform-schema-definitions";
import handleError from "../helpers/errors/ErrorHandler";
import log from "../helpers/Logger";
import ParkingZonesWorker from "../workers/ParkingZonesWorker";
import BaseQueueProcessor from "./BaseQueueProcessor";

const config = require("../config/ConfigLoader");

export default class ParkingZonesQueueProcessor extends BaseQueueProcessor {

    private queuePrefix: string;

    constructor(channel: amqplib.Channel) {
        super(channel);
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + ParkingZones.name.toLowerCase();
    }

    public registerQueues = async (): Promise<void> => {
        await this.registerQueue(this.queuePrefix + ".refreshDataInDB",
            "*." + this.queuePrefix + ".refreshDataInDB", this.refreshDataInDB, {
                deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                deadLetterRoutingKey: "dead",
                messageTtl: 23 * 60 * 60 * 1000 });
    }

    protected refreshDataInDB = async (msg: any): Promise<void> => {
        try {
            const parkingZonesWorker = new ParkingZonesWorker();
            log.debug(" [>] " + this.queuePrefix + ".refreshDataInDB received some data.");
            await parkingZonesWorker.refreshDataInDB();

            this.channel.ack(msg);
            log.debug(" [<] " + this.queuePrefix + ".refreshDataInDB: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg, false, false);
        }
    }

}
