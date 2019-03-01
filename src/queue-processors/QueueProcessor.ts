"use strict";

import * as amqplib from "amqplib";
import IQueueDefinition from "../definitions/IQueueDefinition";
import handleError from "../helpers/errors/ErrorHandler";
import log from "../helpers/Logger";

const config = require("../config/ConfigLoader");

export default class QueueProcessor {

    protected channel: amqplib.Channel;
    private definition: IQueueDefinition;

    constructor(channel: amqplib.Channel, definition: IQueueDefinition) {
        this.channel = channel;
        this.definition = definition;
    }

    /**
     * Registering all queues from definition
     */
    public registerQueues = async (): Promise<void> => {
        const promises = this.definition.queues.map((q) => {
            return this.registerQueue(
                this.definition.queuePrefix + "." + q.name, // queue name
                "*." + this.definition.queuePrefix + "." + q.name, // queue exchange key
                (q.customProcessFunction) // queue processor
                    ? q.customProcessFunction // custom processor from definition
                    : async (msg) => { // default processor
                        await this.defaultProcessor(msg, q.name, async () => {
                            const w = new q.worker();
                            await w[q.workerMethod](msg);
                        });
                    },
                q.options, // queue options
            );
        });
        await Promise.all(promises);
    }

    /**
     * Default queue processor
     */
    protected defaultProcessor = async (msg: any, name: string, worker: () => Promise<void>): Promise<void> => {
        try {
            log.verbose("[>] " + this.definition.queuePrefix + "." + name + ": received some data.");

            await worker();

            this.channel.ack(msg);
            log.verbose("[<] " + this.definition.queuePrefix + "." + name + ": done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg, false, false);
        }
    }

    protected registerQueue = async (
            name: string,
            key: string,
            processor: (msg: any) => any,
            queueOptions: object = {}): Promise<any> => {
        this.channel.assertExchange(config.RABBIT_EXCHANGE_NAME, "topic", {durable: false});
        const q = await this.channel.assertQueue(name, {...queueOptions, ...{durable: true}});
        this.channel.prefetch(1); // This tells RabbitMQ not to give more than one message to a worker at a time.
        this.channel.bindQueue(q.queue, config.RABBIT_EXCHANGE_NAME, key);
        log.verbose("[*] Waiting for messages in " + name + ".");
        this.channel.consume(name, processor, {noAck: false});
    }

}
