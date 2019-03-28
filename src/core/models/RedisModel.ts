"use strict";

import * as Redis from "ioredis";
import { log, Validator } from "../helpers";
import { CustomError } from "../helpers/errors";
import { IModel, IRedisSettings } from "./";

const { RedisConnector } = require("../helpers/RedisConnector");

export class RedisModel implements IModel {

    /** Model name */
    public name: string;
    /** The Redis Connection */
    protected connection: Redis.Redis;
    /** Defines key construction */
    protected isKeyConstructedFromData: boolean;
    /**  */
    protected encodeDataBeforeSave: (raw: any) => any;
    /**  */
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
        this.validator = validator; // not used yet

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
        } else {
            log.warn(this.name + ": Model validator is not set.");
        }

        let prefix = (!useTmpTable) ? this.prefix : this.tmpPrefix;
        prefix = (prefix !== "") ? prefix + "_" : prefix;

        if (data instanceof Array) {
            const multi = this.connection.multi();
            data.forEach((d) => {
                const k = (this.isKeyConstructedFromData)
                    ? this.getSubElement(key, d)
                    : key;
                return this.connection.set(prefix + k, this.encodeDataBeforeSave(d));
            });
            return multi.exec();
        } else {
            const k = (this.isKeyConstructedFromData)
                ? this.getSubElement(key, data)
                : key;
            return this.connection.set(prefix + k, this.encodeDataBeforeSave(data));
        }
    }

    public getData = async (key: string, useTmpTable: boolean = false): Promise<any> => {
        let prefix = (!useTmpTable) ? this.prefix : this.tmpPrefix;
        prefix = (prefix !== "") ? prefix + "_" : prefix;

        return this.decodeDataAfterGet(await this.connection.get(prefix + key));
    }

    public truncate = async (useTmpTable: boolean = false): Promise<any> => {
        throw new CustomError("Method is not implemented.", true, this.constructor.name, 1025);
    }

    /**
     * Method that reduces object data by path.
     *
     * @param {string} path Specifies where to look for the unique identifier of the object to find it in the data.
     * @param {object} obj Raw data.
     * @returns {object|array} Filtered data.
     */
    protected getSubElement = (path: string, obj: any): any => {
        if (path === "") {
            return obj;
        } else {
            return path.split(".").reduce((prev, curr) => {
                return prev ? prev[curr] : undefined;
            }, obj || self);
        }
    }

}
