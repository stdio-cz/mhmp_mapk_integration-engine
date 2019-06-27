"use strict";

import * as fs from "fs";
import * as path from "path";
import { config } from "./core/config";
import { AMQPConnector, mongooseConnection, PostgresConnector, RedisConnector } from "./core/connectors";
import { log } from "./core/helpers";
import { handleError } from "./core/helpers/errors";
import { QueueProcessor } from "./core/queueprocessors";
import { queuesDefinition } from "./definitions";

class App {

    /**
     * Starts the application
     */
    public start = async (): Promise<void> => {
        try {
            log.info(`Commit SHA: ${await this.loadCommitSHA()}`);
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

    /**
     * Loading the Commit SHA of the current build
     */
    private loadCommitSHA = async (): Promise<any> => {
        return new Promise((resolve, reject) => {
            fs.readFile(path.join(__dirname, "..", "commitsha"), (err, data) => {
                if (err) {
                    return resolve(undefined);
                }
                return resolve(data.toString());
            });
        });
    }

}

export default new App().start();
