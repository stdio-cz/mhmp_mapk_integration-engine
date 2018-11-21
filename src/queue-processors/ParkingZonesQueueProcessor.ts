"use strict";

import * as amqplib from "amqplib";
import handleError from "../helpers/errors/ErrorHandler";
import ParkingZonesWorker from "../workers/ParkingZonesWorker";
import BaseQueueProcessor from "./BaseQueueProcessor";

const log = require("debug")("data-platform:integration-engine");

export default class ParkingZonesQueueProcessor extends BaseQueueProcessor {

    constructor(channel: amqplib.Channel) {
        super(channel);
    }

    public registerQueues = async (): Promise<any> => {
        await this.registerQueue("parking-zones-refreshDataInDB",
            "*.parking-zones.refreshDataInDB", this.refreshDataInDB);
    }

    protected refreshDataInDB = async (msg: any): Promise<any> => {
        try {
            const cityDistrictsWorker = new ParkingZonesWorker();
            log(" [>] parking-zones-refreshDataInDB received some data.");
            const res = await cityDistrictsWorker.refreshDataInDB();

            this.channel.ack(msg);
            log(" [<] parking-zones-refreshDataInDB: done");
        } catch (err) {
            handleError(err);
            this.channel.ack(msg);
        }
    }

}
