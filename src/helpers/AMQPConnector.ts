"use strict";

import * as amqplib from "amqplib";
import CustomError from "./errors/CustomError";
import handleError from "./errors/ErrorHandler";

const amqp = require("amqplib");
const config = require("../config/ConfigLoader");
const log = require("debug")("data-platform:integration-engine:connection");

class MyAMQP {

    private channel: amqplib.Channel;

    public connect = async (): Promise<amqplib.Channel|undefined> => {
        try {
            if (this.channel) {
                return this.channel;
            }

            const conn = await amqp.connect(config.RABBIT_CONN);
            this.channel = await conn.createChannel();
            log("Connected to Queue!");
            conn.on("close", () => {
                handleError(new CustomError("Queue disconnected", false));
            });

            await this.assertDeadQueue(this.channel);

            return this.channel;
        } catch (err) {
            throw new CustomError("Error while creating AMQP Channel.", false,
                this.constructor.name, undefined, err);
        }
    }

    private assertDeadQueue = async (channel: amqplib.Channel): Promise<void> => {
        channel.assertExchange(config.RABBIT_EXCHANGE_NAME, "topic", {durable: false});
        const q = channel.assertQueue(config.RABBIT_EXCHANGE_NAME + ".deadqueue", {
            durable: true,
            messageTtl: 3 * 24 * 60 * 60 * 1000, // 3 days in milliseconds
        });
        channel.bindQueue(q.queue, config.RABBIT_EXCHANGE_NAME, "dead");
    }
}

module.exports.amqpChannel = new MyAMQP().connect();
