"use strict";

import mongoose = require("mongoose");
import CustomError from "./errors/CustomError";
import handleError from "./errors/ErrorHandler";

const config = require("../config/ConfigLoader");
const log = require("debug")("data-platform:integration-engine:connection");

class MyMongoose {

    public connect = async (): Promise<void> => {
        try {
            await mongoose.connect(config.MONGO_CONN, {
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
        } catch (err) {
            handleError(new CustomError("Error while connecting to MongoDB.", false,
                this.constructor.name, undefined, err));
        }
    }
}

module.exports.mongooseConnection = new MyMongoose().connect();
