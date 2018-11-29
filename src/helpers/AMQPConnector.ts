"use strict";

import * as amqplib from "amqplib";
import CustomError from "./errors/CustomError";
import handleError from "./errors/ErrorHandler";

const amqp = require("amqplib");
const config = require("../config/ConfigLoader");
const log = require("debug")("data-platform:integration-engine");

class MyAMQP {

    public connect = async (): Promise<amqplib.Channel|undefined> => {
        try {
            const conn = await amqp.connect(config.RABBIT_CONN);
            const channel = await conn.createChannel();
            log("Connected to Queue!");
            conn.on("close", () => {
                handleError(new CustomError("Queue disconnected", false));
            });
            return channel;
        } catch (err) {
            handleError(new CustomError("Error while creating AMQP Channel.", false,
                this.constructor.name, undefined, err));
        }
    }
}

module.exports.amqpChannel = new MyAMQP().connect();
