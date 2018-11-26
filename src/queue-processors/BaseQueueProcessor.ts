"use strict";

import * as amqplib from "amqplib";
import CustomError from "../helpers/errors/CustomError";

const log = require("debug")("data-platform:integration-engine");

export default abstract class BaseQueueProcessor {

    public abstract registerQueues: () => Promise<any>;
    protected channel: amqplib.Channel;

    constructor(channel: amqplib.Channel) {
        this.channel = channel;
    }

    public sendMessageToExchange = async (key: string, msg: any): Promise<any> => {
        try {
            // TODO exchange name to config?
            this.channel.assertExchange("topic_logs", "topic", {durable: false});
            this.channel.publish("topic_logs", key, new Buffer(msg));
        } catch (err) {
            throw new CustomError("Sending the message to exchange failed.", true, this.constructor.name, 1001, err);
        }
    }

    protected registerQueue = async (name: string, key: string, processor: (msg: any) => any): Promise<any> => {
        this.channel.assertExchange("topic_logs", "topic", {durable: false}); // TODO exchange name and key to config?
        const q = await this.channel.assertQueue(name, {durable: true});
        this.channel.prefetch(1); // This tells RabbitMQ not to give more than one message to a worker at a time.
        this.channel.bindQueue(q.queue, "topic_logs", key); // TODO exchange name and key to config?
        log(" [*] Waiting for messages in %s.", name);
        this.channel.consume(name, processor, {noAck: false});
    }

}
