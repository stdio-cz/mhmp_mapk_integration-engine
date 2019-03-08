"use strict";

import * as path from "path";
import CustomError from "../helpers/errors/CustomError";
import log from "../helpers/Logger";
import { IHTTPSettings, IProtocolStrategy } from "./IProtocolStrategy";

const decompress = require("decompress");
const request = require("request-promise");
const moment = require("moment");

export default class HTTPProtocolStrategy implements IProtocolStrategy {

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
                const tmpDir = "/tmp/" + path.parse(this.connectionSettings.url).name + "/";
                const files = await decompress(result, tmpDir, {
                    filter: (this.connectionSettings.whitelistedFiles.length)
                        ? (file) => this.connectionSettings.whitelistedFiles
                            .indexOf(file.path) !== -1
                        : (file) => file,
                });
                result = files.map((file) => {
                    return {
                        filepath: tmpDir + file.path,
                        mtime: file.mtime,
                        name: path.parse(file.path).name,
                        path: file.path,
                    };
                });
            }

            return result;
        } catch (err) {
            log.error(err);
            throw new CustomError("Retrieving of the source data failed.", true, this.constructor.name, 1002, err);
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
