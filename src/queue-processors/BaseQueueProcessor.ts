"use strict";

import * as amqplib from "amqplib";
import CustomError from "../helpers/errors/CustomError";

const log = require("debug")("data-platform:integration-engine:queue");
const config = require("../config/ConfigLoader");

export default abstract class BaseQueueProcessor {

    public abstract registerQueues: () => Promise<any>;
    protected channel: amqplib.Channel;

    constructor(channel: amqplib.Channel) {
        this.channel = channel;
    }

    public sendMessageToExchange = async (key: string, msg: any): Promise<any> => {
        try {
            this.channel.assertExchange(config.RABBIT_EXCHANGE_NAME, "topic", {durable: false});
            this.channel.publish(config.RABBIT_EXCHANGE_NAME, key, new Buffer(msg));
        } catch (err) {
            throw new CustomError("Sending the message to exchange failed.", true, this.constructor.name, 1001, err);
        }
    }

    protected registerQueue = async (name: string, key: string, processor: (msg: any) => any): Promise<any> => {
        this.channel.assertExchange(config.RABBIT_EXCHANGE_NAME, "topic", {durable: false});
        const q = await this.channel.assertQueue(name, {durable: true});
        this.channel.prefetch(1); // This tells RabbitMQ not to give more than one message to a worker at a time.
        this.channel.bindQueue(q.queue, config.RABBIT_EXCHANGE_NAME, key);
        log(" [*] Waiting for messages in %s.", name);
        this.channel.consume(name, processor, {noAck: false});
    }

}
