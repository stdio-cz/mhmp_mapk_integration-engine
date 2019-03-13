"use strict";

import * as Redis from "ioredis";
import CustomError from "./errors/CustomError";
import handleError from "./errors/ErrorHandler";
import log from "./Logger";

const config = require("../config/ConfigLoader");

class MyRedis {

    private connection: Redis.Redis;

    public connect = async (): Promise<Redis.Redis> => {
        try {
            if (this.connection) {
                return this.connection;
            }
            this.connection = new Redis(config.REDIS_CONN);

            this.connection.on("error", (err) => {
                throw new CustomError("Error while connecting to Redis.", false,
                    this.constructor.name, undefined, err);
            });
            this.connection.on("connect", () => {
                log.info("Connected to Redis!");
            });

            return this.connection;
        } catch (err) {
            throw new CustomError("Error while connecting to Redis.", false,
                this.constructor.name, undefined, err);
        }
    }

    public getConnection = (): Redis.Redis => {
        if (!this.connection) {
            throw new CustomError("Redis connection not exists. Firts call connect() method.", false,
                this.constructor.name, undefined);
        }
        return this.connection;
    }
}

module.exports.RedisConnector = new MyRedis();
