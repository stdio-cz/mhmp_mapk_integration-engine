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
        await this.registerQueue("parkings-refreshDataInDB", "*.parkings.refreshDataInDB",
            this.processParkingsWorkerRefreshDataInDB);
        await this.registerQueue("parkings-saveDataToHistory", "*.parkings.saveDataToHistory",
            this.processParkingsWorkerSaveDataToHistory);
    }

    protected registerQueue = async (name: string, key: string, processor: (msg: any) => any): Promise<any> => {
        const q = await this.channel.assertQueue(name, {durable: true});
        this.channel.prefetch(1); // This tells RabbitMQ not to give more than one message to a worker at a time.
        this.channel.bindQueue(q.queue, "topic_logs", key); // TODO exchange name and key to config?
        log(" [*] Waiting for messages in %s.", name);
        this.channel.consume(name, processor, {noAck: false});
    }

    protected processParkingsWorkerRefreshDataInDB = async (msg: any): Promise<any> => {
        try {
            const parkingsWorker = new ParkingsWorker();
            log(" [>] parkings-refreshDataInDB received some data.");
            const res = await parkingsWorker.refreshDataInDB();

            // historization
            await this.sendMessageToExchange("workers.parkings.saveDataToHistory", JSON.stringify(res.features));

            this.channel.ack(msg);
            log(" [<] parkings-refreshDataInDB: done");
        } catch (err) {
            errorLog(err);
        }
    }

    protected processParkingsWorkerSaveDataToHistory = async (msg: any): Promise<any> => {
        try {
            const parkingsWorker = new ParkingsWorker();
            log(" [>] parkings-saveDataToHistory received some data.");
            await parkingsWorker.saveDataToHistory(JSON.parse(msg.content.toString()));

            this.channel.ack(msg);
            log(" [<] parkings-saveDataToHistory: done");
        } catch (err) {
            errorLog(err);
        }
    }

}
