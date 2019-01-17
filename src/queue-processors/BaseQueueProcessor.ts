"use strict";

import * as amqplib from "amqplib";
import log from "../helpers/Logger";

const config = require("../config/ConfigLoader");

export default abstract class BaseQueueProcessor {

    public abstract registerQueues: () => Promise<any>;
    protected channel: amqplib.Channel;

    constructor(channel: amqplib.Channel) {
        this.channel = channel;
    }

    protected registerQueue = async (name: string,
                                     key: string,
                                     processor: (msg: any) => any,
                                     queueOptions: object = {}): Promise<any> => {
        this.channel.assertExchange(config.RABBIT_EXCHANGE_NAME, "topic", {durable: false});
        const q = await this.channel.assertQueue(name, {...queueOptions, ...{durable: true}});
        this.channel.prefetch(1); // This tells RabbitMQ not to give more than one message to a worker at a time.
        this.channel.bindQueue(q.queue, config.RABBIT_EXCHANGE_NAME, key);
        log.debug(" [*] Waiting for messages in " + name + ".");
        this.channel.consume(name, processor, {noAck: false});
    }

}
