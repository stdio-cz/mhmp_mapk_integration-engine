import http from "http";
import express, { Request, Response, NextFunction, RequestHandler } from "@golemio/core/dist/shared/express";
import sentry from "@golemio/core/dist/shared/sentry";
import { CustomError, ErrorHandler, HTTPErrorHandler, ICustomErrorObject } from "@golemio/core/dist/shared/golemio-errors";
import { config } from "@golemio/core/dist/integration-engine/config";
import {
    AMQPConnector,
    MongoConnector,
    PostgresConnector,
    RedisConnector,
} from "@golemio/core/dist/integration-engine/connectors";
import { log, requestLogger } from "@golemio/core/dist/integration-engine/helpers";
import { createLightship, Lightship } from "@golemio/core/dist/shared/lightship";
import { getServiceHealth, BaseApp, Service, IServiceCheck } from "@golemio/core/dist/helpers";
import { QueueProcessor, filterQueueDefinitions } from "@golemio/core/dist/integration-engine/queueprocessors";
import { initSentry, metricsService } from "@golemio/core/dist/monitoring";
import { ModuleLoader } from "./ModuleLoader";

export default class App extends BaseApp {
    public express: express.Application = express();
    public server?: http.Server;
    public metricsServer?: http.Server;
    public port: number = parseInt(config.port || "3006", 10);
    private commitSHA: string | undefined = undefined;
    private lightship: Lightship;
    private queueProcessors: Set<QueueProcessor>;

    /**
     * Run configuration methods on the Express instance
     * and start other necessary services (crons, database, middlewares).
     */
    constructor() {
        super();

        this.lightship = createLightship({
            detectKubernetes: config.NODE_ENV !== "production",
            shutdownHandlerTimeout: config.lightship.handlerTimeout,
            gracefulShutdownTimeout: config.lightship.shutdownTimeout,
            shutdownDelay: config.lightship.shutdownDelay,
        });
        process.on("uncaughtException", (err: Error) => {
            log.error(err);
            this.lightship.shutdown();
        });
        process.on("unhandledRejection", (err: Error) => {
            log.error(err);
            this.lightship.shutdown();
        });

        this.queueProcessors = new Set();
    }

    /**
     * Start the application
     */
    public start = async (): Promise<void> => {
        try {
            initSentry(config.sentry, config.app_name);
            metricsService.init(config, log);
            this.metricsServer = metricsService.serveMetrics();
            await this.expressServer();
            this.commitSHA = await this.loadCommitSHA();
            log.info(`Commit SHA: ${this.commitSHA}`);
            await this.database();
            await this.registerQueues();
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

    /**
     * Start the database connection with initial configuration
     */
    private database = async (): Promise<void> => {
        await MongoConnector.connect();
        await PostgresConnector.connect();
        await RedisConnector.connect();
    };

    /**
     * Graceful shutdown - terminate connections and server
     */
    private gracefulShutdown = async (): Promise<void> => {
        log.info("Graceful shutdown initiated.");
        await this.cancelConsumers();
        await MongoConnector.disconnect();
        await PostgresConnector.disconnect();
        await RedisConnector.disconnect();
        await AMQPConnector.disconnect();
        await this.server?.close();
        await this.metricsServer?.close();
    };

    /**
     * Start the message queue connection, create communication channel
     * and register queue processors to consume messages
     */
    private registerQueues = async (): Promise<void[]> => {
        let { queueDefinitions, workers } = await ModuleLoader.loadModules();

        // Instantiate workers and generate queue definitions
        for (const Worker of workers) {
            const worker = new Worker();
            queueDefinitions.push(worker.getQueueDefinition());
        }

        const filteredQueueDefinitions = filterQueueDefinitions(queueDefinitions, config.queuesBlacklist);
        const channel = await AMQPConnector.connect();

        return Promise.all(
            filteredQueueDefinitions.map((queueDefinition) => {
                const queueProcessor = new QueueProcessor(channel, queueDefinition);

                this.queueProcessors.add(queueProcessor);
                return queueProcessor.registerQueues();
            })
        );
    };

    /**
     * Cancel all consumer operations before shutting down
     */
    private cancelConsumers = async (): Promise<void> => {
        for (const queueProcessor of this.queueProcessors.values()) {
            await queueProcessor.cancelConsumers();
        }
    };

    /**
     * Set custom headers
     */
    private customHeaders = (_req: Request, res: Response, next: NextFunction) => {
        res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS, HEAD");
        next();
    };

    /**
     * Start the express server
     */
    private async expressServer(): Promise<void> {
        this.middleware();
        this.routes();
        this.errorHandlers();

        this.server = http.createServer(this.express);
        // Setup error handler hook on server error
        this.server.on("error", (err) => {
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
     * Bind middleware to express server
     */
    private middleware = (): void => {
        this.express.use(sentry.Handlers.requestHandler() as RequestHandler);
        this.express.use(sentry.Handlers.tracingHandler() as RequestHandler);
        this.express.use(requestLogger);
        this.express.use(this.commonHeaders);
        this.express.use(this.customHeaders);
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

        const serviceStats = await getServiceHealth(services);

        return { ...description, ...serviceStats };
    };

    /**
     * Define express server routes
     */
    private routes = (): void => {
        const defaultRouter = express.Router();

        // base url route handler
        defaultRouter.get(["/", "/health-check", "/status"], async (_req: Request, res: Response, _next: NextFunction) => {
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
        });

        this.express.use("/", defaultRouter);
    };

    /**
     * Define error handling middleware
     */
    private errorHandlers = (): void => {
        this.express.use(sentry.Handlers.errorHandler({ shouldHandleError: () => true }) as express.ErrorRequestHandler);

        // Not found error - no route was matched
        this.express.use((_req: Request, _res: Response, next: NextFunction) => {
            next(new CustomError("Not found", true, undefined, 404));
        });

        // Error handler to catch all errors sent by routers (propagated through next(err))
        this.express.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
            const error: ICustomErrorObject = HTTPErrorHandler.handle(err);
            if (error) {
                log.silly("Error caught by the router error handler.");
                res.setHeader("Content-Type", "application/json; charset=utf-8");
                res.status(error.error_status || 500).send(error);
            }
        });
    };
}
