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
                process.exit(0);
            });
    }

    /**
     * Starts the database connection with initial configuration
     */
    private database = async () => {
        mongoose.Promise = global.Promise;
        return mongoose.connect("mongodb://" + config.mongo.url + "/" + config.mongo.db, {
            auth: {
                authdb: config.mongo.authdb,
            },
            autoReconnect: true,
            bufferMaxEntries: 0, // Don't wait with queries when DB is unavailable
            pass: config.mongo.password,
            user: config.mongo.username,
        }).then(() => {
            log("Connected to DB!");
        }).catch((err) => {
            errorLog(err);
            throw new Error("Error while connecting to DB.");
        });
    }

    private queueProcessors = async () => {
        try {
            const conn = await amqp.connect(config.amqp);
            const ch = await conn.createChannel();
            const parkingsQP = new ParkingsQueueProcessor(ch);

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
