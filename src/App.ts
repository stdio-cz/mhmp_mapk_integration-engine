"use strict";

import mongoose = require("mongoose");
import CustomError from "./helpers/errors/CustomError";
import handleError from "./helpers/errors/ErrorHandler";
import CityDistrictsQueueProcessor from "./queue-processors/CityDistrictsQueueProcessor";
import ParkingsQueueProcessor from "./queue-processors/ParkingsQueueProcessor";

const amqp = require("amqplib");
const config = require("../config.js");
const log = require("debug")("data-platform:integration-engine");

class App {

    /**
     * Starts the application
     */
    public start = async (): Promise<void> => {
        try {
            await this.database();
            await this.queueProcessors();
            log("Started!");
        } catch (err) {
            handleError(err);
        }
    }

    /**
     * Starts the database connection with initial configuration
     */
    private database = async (): Promise<void> => {
        await mongoose.connect(config.mongoConnection, {
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
        const conn = await amqp.connect(config.amqpConnection);
        const ch = await conn.createChannel();
        const parkingsQP = new ParkingsQueueProcessor(ch);
        const cityDistrictsQP = new CityDistrictsQueueProcessor(ch);
        log("Connected to Queue!");
        conn.on("close", () => {
            handleError(new CustomError("Queue disconnected", false));
        });

        await Promise.all([
            parkingsQP.registerQueues(),
            cityDistrictsQP.registerQueues(),
            // ...ready to register more queue processors
        ]);
    }

}

export default new App().start();
