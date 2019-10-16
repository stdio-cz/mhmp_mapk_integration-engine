"use strict";

import { CustomError, ErrorHandler, HTTPErrorHandler, ICustomErrorObject } from "@golemio/errors";
import * as express from "express";
import { FieldType } from "influx";
import * as httpLogger from "morgan";

import * as fs from "fs";
import * as path from "path";
import { config } from "./core/config";
import {
    AMQPConnector,
    InfluxConnector,
    MongoConnector,
    PostgresConnector,
    RedisConnector,
} from "./core/connectors";
import { log } from "./core/helpers";
import { QueueProcessor } from "./core/queueprocessors";
import { queuesDefinition } from "./definitions";

import http = require("http");

export default class App {

    /// Create a new express application instance
    public express: express.Application = express();
    /// The port the express app will listen on
    public port: number = parseInt(config.port || "3006", 10);
    /// The SHA of the last commit from the application running
    private commitSHA: string | undefined = undefined;

    /**
     * Runs configuration methods on the Express instance
     * and start other necessary services (crons, database, middlewares).
     */
    constructor() {
        //
    }

    /**
     * Starts the application
     */
    public start = async (): Promise<void> => {
        try {
            this.commitSHA = await this.loadCommitSHA();
            log.info(`Commit SHA: ${this.commitSHA}`);
            await this.database();
            await this.queueProcessors();
            await this.expressServer();
            log.info("Started!");
        } catch (err) {
            ErrorHandler.handle(err);
        }
    }

    private setHeaders = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        res.setHeader("x-powered-by", "shem");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS, HEAD");
        next();
    }

    /**
     * Starts the database connection with initial configuration
     */
    private database = async (): Promise<void> => {
        await MongoConnector.connect();
        await PostgresConnector.connect();
        await RedisConnector.connect();
        if (config.influx_db.enabled) {
            await InfluxConnector.connect([
                {
                    fields: {
                        number_of_records: FieldType.INTEGER,
                    },
                    measurement: "number_of_records",
                    tags: [
                        "name",
                    ],
                },
            ]);
        }

    }

    /**
     * Starts the message queue connection, creates communication channel
     * and register queue processors to consume messages
     */
    private queueProcessors = async (): Promise<void> => {
        const channel = await AMQPConnector.connect();

        // filtering queue definitions by blacklist
        let filteredQueuesDefinitions = queuesDefinition;
        Object.keys(config.queuesBlacklist).map((b: string) => {
            if (config.queuesBlacklist[b].length === 0) {
                filteredQueuesDefinitions = filteredQueuesDefinitions.filter((a) => a.name !== b);
            } else {
                config.queuesBlacklist[b].map((d: string) => {
                    filteredQueuesDefinitions = filteredQueuesDefinitions.map((a) => {
                        a.queues = a.queues.filter((c) => c.name !== d);
                        return a;
                    });
                });
            }
        });

        // use generic queue processor for register (filtered) queues
        const promises = filteredQueuesDefinitions.map((queueDefinition) => {
            return new QueueProcessor(channel, queueDefinition).registerQueues();
        });
        await Promise.all(promises);
    }

    /**
     * Loading the Commit SHA of the current build
     */
    private loadCommitSHA = async (): Promise<string> => {
        return new Promise<string>((resolve, reject) => {
            fs.readFile(path.join(__dirname, "..", "commitsha"), (err, data) => {
                if (err) {
                    return resolve(undefined);
                }
                return resolve(data.toString());
            });
        });
    }

    /**
     * Starts the express server
     */
    private async expressServer(): Promise<void> {
        this.express = express();
        this.middleware();
        this.routes();

        const server = http.createServer(this.express);
        // Setup error handler hook on server error
        server.on("error", (err: any) => {
            ErrorHandler.handle(new CustomError("Could not start a server", false, undefined, 1, err));
        });
        // Serve the application at the given port
        server.listen(this.port, () => {
            // Success callback
            log.info(`Listening at http://localhost:${this.port}/`);
        });
    }

    /**
     * Binds middlewares to express server
     */
    private middleware = (): void => {
        if (config.NODE_ENV === "development") {
            this.express.use(httpLogger("dev"));
        } else {
            this.express.use(httpLogger("combined"));
        }
        this.express.use(this.setHeaders);
    }

    /**
     * Defines express server routes
     */
    private routes = (): void => {
        const defaultRouter = express.Router();

        // base url route handler
        defaultRouter.get(["/", "/health-check", "/status"],
            (req: express.Request, res: express.Response, next: express.NextFunction) => {

                log.silly("Health check/status called.");

                res.json({
                    app_name: "Golemio Data Platform Integration Engine",
                    commit_sha: this.commitSHA,
                    status: "Up",
                    version: config.app_version,
                });
            });

        this.express.use("/", defaultRouter);

        // Not found error - no route was matched
        this.express.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
            next(new CustomError("Not found", true, undefined, 404));
        });

        // Error handler to catch all errors sent by routers (propagated through next(err))
        this.express.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
            const error: ICustomErrorObject = HTTPErrorHandler.handle(err);
            if (error) {
                log.silly("Error caught by the router error handler.");
                res.setHeader("Content-Type", "application/json; charset=utf-8");
                res.status(error.error_status || 500).send(error);
            }
        });
    }

}
