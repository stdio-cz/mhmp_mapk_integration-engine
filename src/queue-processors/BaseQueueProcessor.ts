"use strict";

import * as amqplib from "amqplib";

export default abstract class BaseQueueProcessor {

    public abstract registerQueues: () => Promise<any>;
    protected channel: amqplib.Channel;

    constructor(channel: amqplib.Channel) {
        this.channel = channel;
    }

    public sendMessageToExchange = async (key, msg): Promise<any> => {
        // TODO exchange name to config?
        this.channel.assertExchange("topic_logs", "topic", {durable: false});
        this.channel.publish("topic_logs", key, new Buffer(msg));
    }
}
