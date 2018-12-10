"use strict";

import * as amqplib from "amqplib";
import handleError from "../helpers/errors/ErrorHandler";
import IGSensorsWorker from "../workers/IGSensorsWorker";
import BaseQueueProcessor from "./BaseQueueProcessor";

const log = require("debug")("data-platform:integration-engine");

export default class IGSensorsQueueProcessor extends BaseQueueProcessor {

    constructor(channel: amqplib.Channel) {
        super(channel);
    }

    public registerQueues = async (): Promise<any> => {
        await this.registerQueue("igsensors-refreshDataInDB",
            "*.igsensors.refreshDataInDB", this.refreshDataInDB);
        await this.registerQueue("igsensors-saveDataToHistory",
            "*.igsensors.saveDataToHistory", this.saveDataToHistory);
    }

    protected refreshDataInDB = async (msg: any): Promise<void> => {
        try {
            const igsensorsWorker = new IGSensorsWorker();
            log(" [>] igsensors-refreshDataInDB received some data.");
            const res = await igsensorsWorker.refreshDataInDB();

            // historization
            await this.sendMessageToExchange("workers.igsensors.saveDataToHistory", JSON.stringify(res.features));

            this.channel.ack(msg);
            log(" [<] igsensors-refreshDataInDB: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg);
        }
    }

    protected saveDataToHistory = async (msg: any): Promise<void> => {
        try {
            const igsensorsWorker = new IGSensorsWorker();
            log(" [>] igsensors-saveDataToHistory received some data.");
            await igsensorsWorker.saveDataToHistory(JSON.parse(msg.content.toString()));

            this.channel.ack(msg);
            log(" [<] igsensors-saveDataToHistory: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg);
        }
    }

}
