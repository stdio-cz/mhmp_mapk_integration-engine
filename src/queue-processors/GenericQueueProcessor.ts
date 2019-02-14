"use strict";

import * as amqplib from "amqplib";
import IQueueDefinition from "../definitions/IQueueDefinition";
import handleError from "../helpers/errors/ErrorHandler";
import log from "../helpers/Logger";
import BaseQueueProcessor from "./BaseQueueProcessor";

export default class GenericQueueProcessor extends BaseQueueProcessor {

    private definition: IQueueDefinition;

    constructor(channel: amqplib.Channel, definition: IQueueDefinition) {
        super(channel);
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
            log.debug(" [>] " + this.definition.queuePrefix + "." + name + ": received some data.");

            await worker();

            this.channel.ack(msg);
            log.debug(" [<] " + this.definition.queuePrefix + "." + name + ": done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg, false, false);
        }
    }

}
