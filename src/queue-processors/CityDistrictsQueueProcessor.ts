"use strict";

import * as amqplib from "amqplib";
import handleError from "../helpers/errors/ErrorHandler";
import CityDistrictsWorker from "../workers/CityDistrictsWorker";
import BaseQueueProcessor from "./BaseQueueProcessor";

const log = require("debug")("data-platform:integration-engine");

export default class CityDistrictsQueueProcessor extends BaseQueueProcessor {

    constructor(channel: amqplib.Channel) {
        super(channel);
    }

    public registerQueues = async (): Promise<any> => {
        await this.registerQueue("city-districts-refreshDataInDB",
            "*.city-districts.refreshDataInDB", this.refreshDataInDB);
    }

    protected registerQueue = async (name: string, key: string, processor: (msg: any) => any): Promise<any> => {
        const q = await this.channel.assertQueue(name, {durable: true});
        this.channel.prefetch(1); // This tells RabbitMQ not to give more than one message to a worker at a time.
        this.channel.bindQueue(q.queue, "topic_logs", key); // TODO exchange name and key to config?
        log(" [*] Waiting for messages in %s.", name);
        this.channel.consume(name, processor, {noAck: false});
    }

    protected refreshDataInDB = async (msg: any): Promise<any> => {
        try {
            const cityDistrictsWorker = new CityDistrictsWorker();
            log(" [>] city-districts-refreshDataInDB received some data.");
            const res = await cityDistrictsWorker.refreshDataInDB();

            this.channel.ack(msg);
            log(" [<] city-districts-refreshDataInDB: done");
        } catch (err) {
            handleError(err);
            this.channel.ack(msg);
        }
    }

}
