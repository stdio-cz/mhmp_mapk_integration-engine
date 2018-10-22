"use strict";

import * as amqplib from "amqplib";

export default abstract class ParkingsQueueProcessor {

    public abstract registerQueues: () => Promise<any>;
    protected channel: amqplib.Channel;

    constructor(channel: amqplib.Channel) {
        this.channel = channel;
    }

    /**
     * TODO pridat exchange
     */
    public sendMessageToQueue = async (key, msg): Promise<any> => {
        await this.channel.assertQueue(key, {durable: true});
        await this.channel.sendToQueue(key, new Buffer(msg), {persistent: true});
    }
}
