"use strict";

import { CustomError, ErrorHandler } from "@golemio/errors";
import * as amqplib from "amqplib";
import { config } from "../config";
import { log } from "../helpers";

class MyAMQP {

    private channel: amqplib.Channel | undefined = undefined;

    public connect = async (): Promise<amqplib.Channel> => {
        try {
            if (this.channel) {
                return this.channel;
            }

            if (!config.RABBIT_CONN) {
                throw new CustomError("The ENV variable RABBIT_CONN cannot be undefined.", true,
                    this.constructor.name, 6003);
            }

            const conn = await amqplib.connect(config.RABBIT_CONN);
            this.channel = await conn.createChannel();

            if (!this.channel) {
                throw new Error("Channel is undefined.");
            }

            log.info("Connected to Queue!");
            conn.on("close", () => {
                ErrorHandler.handle(new CustomError("Queue disconnected", false));
            });

            await this.assertDeadQueue(this.channel);

            return this.channel;
        } catch (err) {
            throw new CustomError("Error while creating AMQP Channel.", false,
                this.constructor.name, 1001, err);
        }
    }

    public getChannel = (): amqplib.Channel => {
        if (!this.channel) {
            throw new CustomError("AMQP channel not exists. Firts call connect() method.", false,
                this.constructor.name, 1002);
        }
        return this.channel;
    }

    private assertDeadQueue = async (channel: amqplib.Channel): Promise<void> => {
        if (!config.RABBIT_EXCHANGE_NAME) {
            throw new CustomError("The ENV variable RABBIT_EXCHANGE_NAME cannot be undefined.", true,
                this.constructor.name, 6003);
        }

        channel.assertExchange(config.RABBIT_EXCHANGE_NAME, "topic", { durable: false });
        const q = await channel.assertQueue(config.RABBIT_EXCHANGE_NAME + ".deadqueue", {
            durable: true,
            messageTtl: 3 * 24 * 60 * 60 * 1000, // 3 days in milliseconds
        });
        channel.bindQueue(q.queue, config.RABBIT_EXCHANGE_NAME, "dead");
    }
}

const AMQPConnector = new MyAMQP();

export { AMQPConnector };
