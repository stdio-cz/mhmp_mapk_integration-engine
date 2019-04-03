"use strict";

import { config } from "./core/config";
import { AMQPConnector, log, mongooseConnection, PostgresConnector, RedisConnector } from "./core/helpers";
import { handleError } from "./core/helpers/errors";
import { QueueProcessor } from "./core/queueprocessors";
import { queuesDefinition } from "./definitions";

class App {

    /**
     * Starts the application
     */
    public start = async (): Promise<void> => {
        try {
            await this.database();
            await this.queueProcessors();
            log.info("Started!");
        } catch (err) {
            handleError(err);
        }
    }

    /**
     * Starts the database connection with initial configuration
     */
    private database = async (): Promise<void> => {
        await mongooseConnection;
        await PostgresConnector.connect();
        await RedisConnector.connect();
    }

    /**
     * Starts the message queue connection, creates communication channel
     * and register queue processors to consume messages
     */
    private queueProcessors = async (): Promise<void> => {
        const ch = await AMQPConnector.connect();

        // filtering queue definitions by blacklist
        let filteredQueuesDefinitions = queuesDefinition;
        Object.keys(config.queuesBlacklist).map((b) => {
            if (config.queuesBlacklist[b].length === 0) {
                filteredQueuesDefinitions = filteredQueuesDefinitions.filter((a) => a.name !== b);
            } else {
                config.queuesBlacklist[b].map((d) => {
                    filteredQueuesDefinitions = filteredQueuesDefinitions.map((a) => {
                        a.queues = a.queues.filter((c) => c.name !== d);
                        return a;
                    });
                });
            }
        });

        // use generic queue processor for register (filtered) queues
        const promises = filteredQueuesDefinitions.map((queueDefinition) => {
            return new QueueProcessor(ch, queueDefinition).registerQueues();
        });
        await Promise.all(promises);
    }

}

export default new App().start();
