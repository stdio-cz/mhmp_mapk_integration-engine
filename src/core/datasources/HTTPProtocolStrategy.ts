"use strict";

import * as path from "path";
import { log } from "../helpers";
import { CustomError } from "../helpers/errors";
import { RedisModel } from "../models";
import { IHTTPSettings, IProtocolStrategy } from "./";

const decompress = require("decompress");
const request = require("request-promise");
const moment = require("moment");

export class HTTPProtocolStrategy implements IProtocolStrategy {

    private connectionSettings: IHTTPSettings;

    constructor(settings: IHTTPSettings) {
        this.connectionSettings = settings;
    }

    public setConnectionSettings = (settings: IHTTPSettings): void => {
        this.connectionSettings = settings;
    }

    public getData = async (): Promise<any> => {
        try {
            let result = await request(this.connectionSettings);

            if (this.connectionSettings.isCompressed) {
                const prefix = path.parse(this.connectionSettings.url).name + "/";
                const files = await decompress(result, {
                    filter: (this.connectionSettings.whitelistedFiles
                            && this.connectionSettings.whitelistedFiles.length)
                        ? (file) => this.connectionSettings.whitelistedFiles
                            .indexOf(file.path) !== -1
                        : (file) => file,
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
            throw new CustomError("Error while getting data from server.", true, this.constructor.name, 1029, err);
        }
    }

    public getLastModified = async (): Promise<string> => {
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
