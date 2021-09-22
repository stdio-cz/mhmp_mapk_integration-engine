import { CustomError, ErrorHandler, HTTPErrorHandler, ICustomErrorObject } from "@golemio/core/dist/shared/golemio-errors";
import express from "@golemio/core/dist/shared/express";
import { FieldType } from "@golemio/core/dist/shared/influx";
import httpLogger from "morgan";
import sentry from "@golemio/core/dist/shared/sentry";

import fs from "fs";
import path from "path";
import http from "http";
import { config } from "@golemio/core/dist/integration-engine/config";
import {
    AMQPConnector,
    InfluxConnector,
    MongoConnector,
    PostgresConnector,
    RedisConnector,
} from "@golemio/core/dist/integration-engine/connectors";
import { log } from "@golemio/core/dist/integration-engine/helpers";
import { createLightship, Lightship } from "@golemio/core/dist/shared/lightship";
import { getServiceHealth, Service, IServiceCheck } from "@golemio/core/dist/helpers";
import { QueueProcessor } from "@golemio/core/dist/integration-engine/queueprocessors";
import { queuesDefinition } from "./definitions";
import { initSentry } from "@golemio/core/dist/monitoring";

export default class App {
    /// Create a new express application instance
    public express: express.Application = express();
    public server?: http.Server;
    /// The port the express app will listen on
    public port: number = parseInt(config.port || "3006", 10);
    /// The SHA of the last commit from the application running
    private commitSHA: string | undefined = undefined;
    private lightship: Lightship;

    /**
     * Runs configuration methods on the Express instance
     * and start other necessary services (crons, database, middlewares).
     */
    constructor() {
        this.lightship = createLightship({ shutdownHandlerTimeout: 10000 });
        process.on("uncaughtException", (err: Error) => {
            log.error(err);
            this.lightship.shutdown();
        });
        process.on("unhandledRejection", (err: Error) => {
            log.error(err);
            this.lightship.shutdown();
        });
    }

    /**
     * Starts the application
     */
    public start = async (): Promise<void> => {
        try {
            initSentry(config.sentry, config.app_name);
            await this.expressServer();
            this.commitSHA = await this.loadCommitSHA();
            log.info(`Commit SHA: ${this.commitSHA}`);
            await this.database();
            await this.queueProcessors();
            log.info("Started!");
            this.lightship.registerShutdownHandler(async () => {
                await this.gracefulShutdown();
            });
            this.lightship.signalReady();
        } catch (err) {
            sentry.captureException(err);
            ErrorHandler.handle(err);
        }
    };

    private setHeaders = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        res.setHeader("x-powered-by", "shem");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS, HEAD");
        next();
    };

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
                    tags: ["name"],
                },
            ]);
        }
    };

    /**
     * Graceful shutdown - terminate connections and server
     */
    private gracefulShutdown = async (): Promise<void> => {
        log.info("Graceful shutdown initiated.");
        await MongoConnector.disconnect();
        await PostgresConnector.disconnect();
        await RedisConnector.disconnect();
        if (config.influx_db.enabled) {
            await InfluxConnector.disconnect();
        }
        await AMQPConnector.disconnect();
        await this.server?.close();
    };

    /**
     * Starts the message queue connection, creates communication channel
     * and register queue processors to consume messages
     */
    private queueProcessors = async (): Promise<void> => {
        const channel = await AMQPConnector.connect();

        // filtering queue definitions by blacklist
        let filteredQueuesDefinitions = await queuesDefinition;

        for (const datasetName in config.queuesBlacklist) {
            if (config.queuesBlacklist[datasetName].length === 0) {
                // all dataset queues are filtered
                filteredQueuesDefinitions = filteredQueuesDefinitions.filter((queueDef) => queueDef.name !== datasetName);
            } else {
                // only named queues of dataset are filtered
                for (let i = 0, imax = filteredQueuesDefinitions.length; i < imax; i++) {
                    if (filteredQueuesDefinitions[i].name === datasetName) {
                        filteredQueuesDefinitions[i].queues = filteredQueuesDefinitions[i].queues.filter(function (queue) {
                            // @ts-ignore
                            return this.indexOf(queue.name) < 0;
                        }, config.queuesBlacklist[datasetName]);
                    }
                }
            }
        }

        // use generic queue processor for register (filtered) queues
        const promises = filteredQueuesDefinitions.map((queueDefinition) => {
            return new QueueProcessor(channel, queueDefinition).registerQueues();
        });
        await Promise.all(promises);
    };

    /**
     * Loading the Commit SHA of the current build
     */
    private loadCommitSHA = async (): Promise<string> => {
        return new Promise<string>((resolve) => {
            fs.readFile(path.join(__dirname, "..", "commitsha"), (err, data) => {
                if (err) {
                    return resolve(undefined as any);
                }
                return resolve(data.toString());
            });
        });
    };

    /**
     * Starts the express server
     */
    private async expressServer(): Promise<void> {
        this.middleware();
        this.routes();
        this.errorHandlers();

        this.server = http.createServer(this.express);
        // Setup error handler hook on server error
        this.server.on("error", (err: any) => {
            sentry.captureException(err);
            ErrorHandler.handle(new CustomError("Could not start a server", false, undefined, 1, err));
        });
        // Serve the application at the given port
        this.server.listen(this.port, () => {
            // Success callback
            log.info(`Listening at http://localhost:${this.port}/`);
        });
    }

    /**
     * Binds middlewares to express server
     */
    private middleware = (): void => {
        this.express.use(sentry.Handlers.requestHandler() as express.RequestHandler);
        this.express.use(sentry.Handlers.tracingHandler() as express.RequestHandler);

        if (config.NODE_ENV === "development") {
            this.express.use(httpLogger("dev"));
        } else {
            this.express.use(httpLogger("combined"));
        }
        this.express.use(this.setHeaders);
    };

    private healthCheck = async () => {
        const description = {
            app: "Golemio Data Platform Integration Engine",
            commitSha: this.commitSHA,
            version: config.app_version,
        };

        const services: IServiceCheck[] = [
            { name: Service.POSTGRES, check: PostgresConnector.isConnected },
            { name: Service.MONGO, check: MongoConnector.isConnected },
            { name: Service.REDIS, check: RedisConnector.isConnected },
            { name: Service.RABBITMQ, check: AMQPConnector.isConnected },
        ];

        if (config.influx_db.enabled) {
            services.push({ name: Service.INFLUX, check: InfluxConnector.isConnected });
        }

        const serviceStats = await getServiceHealth(services);

        return { ...description, ...serviceStats };
    };

    /**
     * Defines express server routes
     */
    private routes = (): void => {
        const defaultRouter = express.Router();

        // base url route handler
        defaultRouter.get(
            ["/", "/health-check", "/status"],
            async (req: express.Request, res: express.Response, next: express.NextFunction) => {
                try {
                    const healthStats = await this.healthCheck();
                    if (healthStats.health) {
                        return res.json(healthStats);
                    } else {
                        return res.status(503).send(healthStats);
                    }
                } catch (err) {
                    return res.status(503);
                }
            }
        );

        this.express.use("/", defaultRouter);
    };

    private errorHandlers = (): void => {
        this.express.use(sentry.Handlers.errorHandler({ shouldHandleError: () => true }) as express.ErrorRequestHandler);

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
    };
}
