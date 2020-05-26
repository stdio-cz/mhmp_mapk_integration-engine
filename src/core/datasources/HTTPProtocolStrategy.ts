"use strict";

import { CustomError } from "@golemio/errors";
import * as moment from "moment";
import * as path from "path";
import { log } from "../helpers";
import { RedisModel } from "../models";
import { IHTTPSettings, IProtocolStrategy } from "./";

import { ProtocolStrategy } from "./ProtocolStrategy";

import decompress = require("decompress");
import request = require("request-promise");

const zlib = require("zlib");
const util = require("util");
const gunzip = util.promisify(zlib.gunzip);

export class HTTPProtocolStrategy extends ProtocolStrategy implements IProtocolStrategy {

    protected connectionSettings: IHTTPSettings;

    constructor(settings: IHTTPSettings) {
        super(settings);
    }

    public setConnectionSettings = (settings: IHTTPSettings): void => {
        this.connectionSettings = settings;
    }

    public getRawData = async (): Promise<any> => {
        try {
            let result = await request(this.connectionSettings);

            if (this.connectionSettings.isGunZipped) {
                result = await gunzip(result);
            }

            if (this.connectionSettings.isCompressed) {
                const prefix = path.parse(this.connectionSettings.url).name + "/";
                const files = await decompress(result, {
                    filter: (this.connectionSettings.whitelistedFiles
                        && this.connectionSettings.whitelistedFiles.length)
                        ? (file: any) => this.connectionSettings.whitelistedFiles
                            .indexOf(file.path) !== -1
                        : (file: any) => file,
                });
                const redisModel = new RedisModel("HTTPProtocolStrategy" + "Model", {
                    isKeyConstructedFromData: false,
                    prefix: "files",
                },
                    null);
                result = await Promise.all(files.map(async (file) => {
                    await redisModel.save(prefix + file.path, file.data.toString("hex"));
                    return {
                        filepath: prefix + file.path,
                        mtime: file.mtime,
                        name: path.parse(file.path).name,
                        path: file.path,
                    };
                }));
            }
            return result;
        } catch (err) {
            throw new CustomError("Error while getting data from server.", true, this.constructor.name, 2002, err);
        }
    }

    public getLastModified = async (): Promise<string | null> => {
        try {
            const s = this.connectionSettings;
            s.method = "HEAD";
            const res = await request(this.connectionSettings);
            return (res["last-modified"]) ? moment(res["last-modified"]).toISOString() : null;
        } catch (err) {
            log.error(err);
            return null;
        }
    }

}
