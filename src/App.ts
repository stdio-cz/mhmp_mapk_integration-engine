"use strict";

import mongoose = require("mongoose");
import * as path from "path";
import CustomError from "./helpers/errors/CustomError";
import handleError from "./helpers/errors/ErrorHandler";
import CityDistrictsQueueProcessor from "./queue-processors/CityDistrictsQueueProcessor";
import IGSensorsQueueProcessor from "./queue-processors/IGSensorsQueueProcessor";
import ParkingsQueueProcessor from "./queue-processors/ParkingsQueueProcessor";

const amqp = require("amqplib");
const debug = require("debug");
const dotenv = require("dotenv");
const log = require("debug")("data-platform:integration-engine");
const warning = require("debug")("data-platform:integration-engine:warning");

class App {

    /**
     * Starts the application
     */
    public start = async (): Promise<void> => {
        try {
            await this.envInit();
            await this.database();
            await this.queueProcessors();
            log("Started!");
        } catch (err) {
            handleError(err);
        }
    }

    /**
     * Initialize environment configuration
     */
    private envInit = async (): Promise<void> => {
        const env = dotenv.config({ path: path.resolve(process.cwd(), "config/.env") });
        debug.enable(process.env.DEBUG);

        if (env.error) {
            dotenv.config({ path: path.resolve(process.cwd(), "config/.env.default") });
            debug.enable(process.env.DEBUG);
            warning("The environment config file was not loaded. The default env file was used.");
        }
    }

    /**
     * Starts the database connection with initial configuration
     */
    private database = async (): Promise<void> => {
        await mongoose.connect(process.env.MONGO_CONN, {
            autoReconnect: true,
            bufferMaxEntries: 0,
            reconnectInterval: 5000, // Reconnect every 5s
            reconnectTries: Number.MAX_VALUE, // Never stop trying to reconnect
            useCreateIndex: true,
            useFindAndModify: false,
            useNewUrlParser: true,
        });
        log("Connected to DB!");
        mongoose.connection.on("disconnected", () => {
            handleError(new CustomError("Database disconnected", false));
        });
    }

    /**
     * Starts the message queue connection, creates communication channel
     * and register queue processors to consume messages
     */
    private queueProcessors = async (): Promise<void> => {
        const conn = await amqp.connect(process.env.RABBIT_CONN);
        const ch = await conn.createChannel();
        const parkingsQP = new ParkingsQueueProcessor(ch);
        const cityDistrictsQP = new CityDistrictsQueueProcessor(ch);
        const igsensorsQP = new IGSensorsQueueProcessor(ch);
        log("Connected to Queue!");
        conn.on("close", () => {
            handleError(new CustomError("Queue disconnected", false));
        });

        await Promise.all([
            parkingsQP.registerQueues(),
            cityDistrictsQP.registerQueues(),
            igsensorsQP.registerQueues(),
            // ...ready to register more queue processors
        ]);
    }

}

export default new App().start();
