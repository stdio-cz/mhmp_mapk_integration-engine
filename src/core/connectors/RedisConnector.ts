"use strict";

import { CustomError } from "@golemio/errors";
import * as Redis from "ioredis";
import { config } from "../config";
import { log } from "../helpers";

class MyRedis {

    private connection: Redis.Redis | undefined;

    public connect = async (): Promise<Redis.Redis> => {
        try {
            if (this.connection) {
                return this.connection;
            }

            if (!config.REDIS_CONN) {
                throw new CustomError("The ENV variable REDIS_CONN cannot be undefined.", true,
                    this.constructor.name, 6003);
            }

            this.connection = new Redis(config.REDIS_CONN);

            if (!this.connection) {
                throw new Error("Connection is undefined.");
            }

            this.connection.on("error", (err) => {
                throw new CustomError("Error while connecting to Redis.", false,
                    this.constructor.name, 1001, err);
            });
            this.connection.on("connect", () => {
                log.info("Connected to Redis!");
            });

            return this.connection;
        } catch (err) {
            throw new CustomError("Error while connecting to Redis.", false,
                this.constructor.name, 1001, err);
        }
    }

    public getConnection = (): Redis.Redis => {
        if (!this.connection) {
            throw new CustomError("Redis connection does not exists. First call connect() method.", false,
                this.constructor.name, 1002);
        }
        return this.connection;
    }
}

const RedisConnector = new MyRedis();

export { RedisConnector };
