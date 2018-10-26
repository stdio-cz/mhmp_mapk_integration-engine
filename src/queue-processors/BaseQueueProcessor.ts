"use strict";

import * as amqplib from "amqplib";
import CustomError from "../helpers/errors/CustomError";

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
            throw new CustomError("Sending the message to exchange failed.", true, 1001, err);
        }
    }
}
