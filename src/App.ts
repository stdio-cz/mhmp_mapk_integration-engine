"use strict";

import mongoose = require("mongoose");
import ParkingsQueueProcessor from "./queue-processors/ParkingsQueueProcessor";

const amqp = require("amqplib");
const config = require("../config.js");
const log = require("debug")("App");
const errorLog = require("debug")("error");

class App {

    constructor() {
        this.database()
            .then(() => {
                return this.queueProcessors();
            }).then(() => {
                log("Started!");
            }).catch((err) => {
                errorLog(err);
                process.exit(0); // if anything fails, process is killed
            });
    }

    /**
     * Starts the database connection with initial configuration
     */
    private database = async () => {
        try {
            mongoose.Promise = global.Promise;
            await mongoose.connect(config.mongo.url, config.mongo.options);
            log("Connected to DB!");
        } catch (err) {
            errorLog(err);
            throw new Error("Error while connecting to DB.");
        }
    }

    private queueProcessors = async () => {
        try {
            const conn = await amqp.connect(config.amqp);
            const ch = await conn.createChannel();
            const parkingsQP = new ParkingsQueueProcessor(ch);

            // ready to register more queue processors
            return Promise.all([
                parkingsQP.registerQueues(),
            ]);
        } catch (err) {
            errorLog(err);
            throw new Error("Error while processing the queue.");
        }
    }

}

export default new App();
