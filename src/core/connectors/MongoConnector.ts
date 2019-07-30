"use strict";

import { CustomError, handleError } from "golemio-errors";
import { config } from "../config";
import { log } from "../helpers";

import mongoose = require("mongoose");

class MyMongoose {

    public connect = async (): Promise<void> => {
        try {
            await mongoose.connect(config.MONGO_CONN, {
                autoReconnect: true,
                bufferMaxEntries: 0,
                connectTimeoutMS: 90000,
                reconnectInterval: 5000, // Reconnect every 5s
                reconnectTries: Number.MAX_VALUE, // Never stop trying to reconnect
                socketTimeoutMS: 90000,
                useCreateIndex: true,
                useFindAndModify: false,
                useNewUrlParser: true,
            });
            log.info("Connected to MongoDB!");
            mongoose.connection.on("disconnected", () => {
                handleError(new CustomError("Database disconnected", false));
            });
        } catch (err) {
            throw new CustomError("Error while connecting to MongoDB.", false,
                this.constructor.name, undefined, err);
        }
    }
}

const mongooseConnection = new MyMongoose().connect();

export { mongooseConnection };
