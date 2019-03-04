"use strict";

import CustomError from "../helpers/errors/CustomError";
import log from "../helpers/Logger";
import { IHTTPSettings, IProtocolStrategy } from "./IProtocolStrategy";

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
            return request(this.connectionSettings);
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
