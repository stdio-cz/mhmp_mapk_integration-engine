"use strict";

import * as Redis from "ioredis";
import { RedisConnector } from "../connectors";
import { getSubProperty, log, Validator } from "../helpers";
import { CustomError } from "../helpers/errors";
import { IModel, IRedisSettings } from "./";

export class RedisModel implements IModel {

    /** Model name */
    public name: string;
    /** The Redis Connection */
    protected connection: Redis.Redis;
    /** Defines key construction */
    protected isKeyConstructedFromData: boolean;
    /** Function for encoding data (typically to string) before saving to Redis */
    protected encodeDataBeforeSave: (raw: any) => any;
    /** Function for decoding data (typically from string) after getting from Redis */
    protected decodeDataAfterGet: (encoded: any) => any;
    /** Key prefix to identify model */
    protected prefix: string;
    /** Key prefix to identify tmp model */
    protected tmpPrefix: string;
    /** Validation helper */
    protected validator: Validator;

    constructor(name: string, settings: IRedisSettings, validator: Validator) {
        this.name = name;
        this.connection = RedisConnector.getConnection();
        this.isKeyConstructedFromData = settings.isKeyConstructedFromData;
        this.prefix = settings.prefix;
        this.tmpPrefix = settings.tmpPrefix;
        this.validator = validator;

        this.encodeDataBeforeSave = (settings.encodeDataBeforeSave)
            ? settings.encodeDataBeforeSave
            : (raw) => raw;
        this.decodeDataAfterGet = (settings.decodeDataAfterGet)
            ? settings.decodeDataAfterGet
            : (raw) => raw;
    }

    public save = async (key: string, data: any, useTmpTable: boolean = false): Promise<any> => {
        // data validation
        if (this.validator) {
            await this.validator.Validate(data);
        } else if (!this.validator && this.isKeyConstructedFromData) {
            log.warn(this.name + ": Model validator is not set.");
        }

        let prefix = (!useTmpTable) ? this.prefix : this.tmpPrefix;
        prefix = (!prefix || prefix === "") ? "(default)" : prefix;

        if (data instanceof Array) {
            // start the redis transaction
            const multi = this.connection.multi();

            data.forEach((d) => {
                // checking if the value is type of object
                if (this.isKeyConstructedFromData && typeof d !== "object") {
                    throw new CustomError("The data must be a type of object.", true, this.constructor.name);
                }
                const k = (this.isKeyConstructedFromData)
                    ? getSubProperty(key, d)
                    : key;
                // encoding and saving the data as redis hash
                return multi.hset(prefix, k, this.encodeDataBeforeSave(d));
            });

            // redis transaction commit
            return multi.exec();
        } else {
            // checking if the value is type of object
            if (this.isKeyConstructedFromData && typeof data !== "object") {
                throw new CustomError("The data must be a type of object.", true, this.constructor.name);
            }
            const k = (this.isKeyConstructedFromData)
                ? getSubProperty(key, data)
                : key;
            // encoding and saving the data as redis hash
            return this.connection.hset(prefix, k, this.encodeDataBeforeSave(data));
        }
    }

    public getData = async (key: string, useTmpTable: boolean = false): Promise<any> => {
        let prefix = (!useTmpTable) ? this.prefix : this.tmpPrefix;
        prefix = (!prefix || prefix === "") ? "(default)" : prefix;
        // getting and decoding the data from redis hash
        return this.decodeDataAfterGet(await this.connection.hget(prefix, key));
    }

    public truncate = async (useTmpTable: boolean = false): Promise<any> => {
        let prefix = (!useTmpTable) ? this.prefix : this.tmpPrefix;
        prefix = (!prefix || prefix === "") ? "(default)" : prefix;

        return this.connection.del(prefix);
    }

}
