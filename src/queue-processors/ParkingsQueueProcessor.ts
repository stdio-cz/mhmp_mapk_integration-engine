"use strict";

import * as amqplib from "amqplib";
import ParkingsWorker from "../workers/ParkingsWorker";
import BaseQueueProcessor from "./BaseQueueProcessor";

const log = require("debug")("ParkingsQueueProcessor");
const errorLog = require("debug")("error");

export default class ParkingsQueueProcessor extends BaseQueueProcessor {

    constructor(channel: amqplib.Channel) {
        super(channel);
    }

    public registerQueues = async (): Promise<any> => {
        await this.registerQueue("ParkingsWorker.refreshDataInDB", this.processParkingsWorkerRefreshDataInDB);
        await this.registerQueue("ParkingsWorker.saveDataToHistory", this.processParkingsWorkerSaveDataToHistory);
    }

    protected registerQueue = async (name: string, processor: (msg: any) => any): Promise<any> => {
        await this.channel.assertQueue(name, {durable: true});
        this.channel.prefetch(1); // This tells RabbitMQ not to give more than one message to a worker at a time.
        log(" [*] Waiting for messages in %s.", name);
        this.channel.consume(name, processor, {noAck: false});
    }

    protected processParkingsWorkerRefreshDataInDB = async (msg: any): Promise<any> => {
        try {
            const parkingsWorker = new ParkingsWorker();
            log(" [>] ParkingsWorker.refreshDataInDB received some data.");
            const res = await parkingsWorker.refreshDataInDB();

            // historization
            await this.sendMessageToQueue("ParkingsWorker.saveDataToHistory", JSON.stringify(res.features));

            this.channel.ack(msg);
            log(" [<] ParkingsWorker.refreshDataInDB: done");
        } catch (err) {
            errorLog(err);
        }
    }

    protected processParkingsWorkerSaveDataToHistory = async (msg: any): Promise<any> => {
        try {
            const parkingsWorker = new ParkingsWorker();
            log(" [>] ParkingsWorker.saveDataToHistory received some data.");
            await parkingsWorker.saveDataToHistory(JSON.parse(msg.content.toString()));

            this.channel.ack(msg);
            log(" [<] ParkingsWorker.saveDataToHistory: done");
        } catch (err) {
            errorLog(err);
        }
    }

}
