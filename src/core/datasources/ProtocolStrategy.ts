"use strict";

import { DataSourceStream, IProtocolStrategy } from "./";

import { Readable } from "stream";

import * as RawDaraStore from "../helpers/RawDaraStore";

import { log } from "../helpers";

import { config } from "../config";

export class ProtocolStrategy implements IProtocolStrategy {

    protected connectionSettings: any;

    private caller = "Unknown";

    constructor(settings: any ) {
        this.connectionSettings = settings;
    }

    public setCallerName = (caller: string = "unknown datasource") => {
        this.caller = caller; // no ohher way ?
    }

    public setConnectionSettings = (settings: any): void => {
        this.connectionSettings = settings;
    }

    public async getData(...args): Promise<any | DataSourceStream> {
        const rawData = await this.getRawData(...args);
        let protocolDataStream: any;

        // bit paranoid but ...
        if (rawData && (rawData instanceof Readable || rawData.constructor.name === "Request") && rawData.on) {
            protocolDataStream = rawData;

            const S3Stream = new Readable({
                objectMode: false,
                read: () => {
                    return;
                },
            });
            const dataStream =  new DataSourceStream({
                objectMode: true,
                read: () => {
                    return;
                },
            });

            // need to reemit data to the new stream to avoid data loss in future on 'data' events
            protocolDataStream.on("data", (data) => {
                dataStream.push(data);
                this.pushRawDataToS3Stream(data, S3Stream);
            });

            protocolDataStream.on("error", (err) => {
                dataStream.emit("error", err);
            });

            protocolDataStream.on("end", () => {
                dataStream.emit("end");
                S3Stream.push(null);
            });

            S3Stream.on("end", () => {
                return;
            });

            S3Stream.on("error", (err) => {
                log.error(`Error on saving raw data for ${this.caller}`, err);
            });

            RawDaraStore.save(S3Stream, this.caller);
            return dataStream;
        } else {
            RawDaraStore.save(this.prepareRawData(rawData), this.caller);
            return rawData;
        }

    }

    public getLastModified = async (): Promise<string | null> => {
        throw new Error("getLastModified: Method not implemented.");
    }

    protected getRawData = async (...args: any): Promise<any | DataSourceStream> => {
        throw new Error("getRawData: Method not implemented.");
    }

    private prepareRawData = (data: any): string | null => {
        let outData: any = null;

        if ((data instanceof Uint8Array) || (data instanceof Buffer)) {
            outData = data.toString();
        }

        if (!outData && typeof data === "object") {
            try {
                outData = JSON.stringify(data);
            } catch {
                null;
            }
        }

        if (!outData && data && data.toString()) {
            outData = data.toString();
        }

        return outData;
    }

    private pushRawDataToS3Stream = (data: any, S3Stream: Readable): void => {
        if (config.s3.enabled && config.saveRawDataWhitelist[this.caller]) {
            const outData = this.prepareRawData(data);

            if ( outData && typeof outData === "string") {
                S3Stream.push(outData);
                if (typeof outData === "string") {
                    S3Stream.push("\n");
                }
            } else {
                log.error(`Unable to save \`rawData\` in \`${this.caller}\`:
                \`Buffer\`, \`Uint8Array\` or  \`string\` is required, but got
                 \`${Object.prototype.toString.call(outData)}\``);
            }
        }
    }
}
