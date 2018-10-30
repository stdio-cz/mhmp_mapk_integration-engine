"use strict";

import * as amqplib from "amqplib";
import handleError from "../helpers/errors/ErrorHandler";
import ParkingsWorker from "../workers/ParkingsWorker";
import BaseQueueProcessor from "./BaseQueueProcessor";

const log = require("debug")("data-platform:integration-engine");

export default class ParkingsQueueProcessor extends BaseQueueProcessor {

    constructor(channel: amqplib.Channel) {
        super(channel);
    }

    public registerQueues = async (): Promise<any> => {
        await this.registerQueue("parkings-refreshDataInDB",
            "*.parkings.refreshDataInDB", this.refreshDataInDB);
        await this.registerQueue("parkings-saveDataToHistory",
            "*.parkings.saveDataToHistory", this.saveDataToHistory);
        await this.registerQueue("parkings-updateAddressAndDistrict",
            "*.parkings.updateAddressAndDistrict", this.updateAddressAndDistrict);
    }

    protected registerQueue = async (name: string, key: string, processor: (msg: any) => any): Promise<any> => {
        const q = await this.channel.assertQueue(name, {durable: true});
        this.channel.prefetch(1); // This tells RabbitMQ not to give more than one message to a worker at a time.
        this.channel.bindQueue(q.queue, "topic_logs", key); // TODO exchange name and key to config?
        log(" [*] Waiting for messages in %s.", name);
        this.channel.consume(name, processor, {noAck: false});
    }

    protected refreshDataInDB = async (msg: any): Promise<void> => {
        try {
            const parkingsWorker = new ParkingsWorker();
            log(" [>] parkings-refreshDataInDB received some data.");
            const res = await parkingsWorker.refreshDataInDB();

            // historization
            await this.sendMessageToExchange("workers.parkings.saveDataToHistory", JSON.stringify(res.features));

            // TODO promyslet jestli je to spravne nebo to dat nekam jinam
            // updating district and address by JS Closure
            const parkings = res.features;
            const promises = parkings.map((p) => {
                this.sendMessageToExchange("workers.parkings.updateAddressAndDistrict",
                    JSON.stringify(p));
            });
            await Promise.all(promises);

            this.channel.ack(msg);
            log(" [<] parkings-refreshDataInDB: done");
        } catch (err) {
            handleError(err);
            this.channel.ack(msg);
        }
    }

    protected saveDataToHistory = async (msg: any): Promise<void> => {
        try {
            const parkingsWorker = new ParkingsWorker();
            log(" [>] parkings-saveDataToHistory received some data.");
            await parkingsWorker.saveDataToHistory(JSON.parse(msg.content.toString()));

            this.channel.ack(msg);
            log(" [<] parkings-saveDataToHistory: done");
        } catch (err) {
            handleError(err);
            this.channel.ack(msg);
        }
    }

    protected updateAddressAndDistrict = async (msg: any): Promise<void> => {
        try {
            const parkingsWorker = new ParkingsWorker();
            log(" [>] parkings-updateAddressAndDistrict received some data.");
            await parkingsWorker.updateAddressAndDistrict(JSON.parse(msg.content.toString()));

            this.channel.ack(msg);
            log(" [<] parkings-updateAddressAndDistrict: done");
        } catch (err) {
            handleError(err);
            this.channel.ack(msg);
        }
    }

}
