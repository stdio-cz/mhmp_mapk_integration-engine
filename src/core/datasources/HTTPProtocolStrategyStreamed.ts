"use strict";

import { CustomError } from "@golemio/errors";
import { DataSourceStream, HTTPProtocolStrategy, IProtocolStrategy} from "./";

import request = require("request");

export class HTTPProtocolStrategyStreamed extends HTTPProtocolStrategy implements IProtocolStrategy {

    private streamTransform: any;

    /**
     * @param {TransformStream} streamTransform data will be piped  to this stream if provided
     */
    public setStreamTransformer = (streamTransform): HTTPProtocolStrategyStreamed => {
        this.streamTransform = streamTransform;
        return this;
    }

    public async getData(): Promise<DataSourceStream>  {
        const dataStream = await super.getData();

        const outStream =  new DataSourceStream({
            objectMode: true,
            read: () => {
                return;
            },
        });

        let dataStreamEnd = false;

        if (this.streamTransform) {
            dataStream.on("data", (data: any) => {
                this.streamTransform.write(data);
            });
            dataStream.on("end", () => {
                this.streamTransform.end();
            });
            this.streamTransform.on("data", (data) => {
                outStream.push(data);
            });
            this.streamTransform.on("end", () => {
                outStream.push(null);
            });
            dataStream.on("error", (error: any) => {
                this.streamTransform.emit("error", error);
            });
        } else {
            dataStream.on("data", (data: any) => {
                outStream.push(data);
            });
            dataStream.on("close", () => {
                // some streams does not emit end event
                if (!dataStreamEnd) {
                    outStream.push(null);
                    dataStreamEnd = true;
                }
            });
            dataStream.on("end", () => {
                // some streams does not emit close event
                if (!dataStreamEnd) {
                    outStream.push(null);
                    dataStreamEnd = true;
                }
            });
            dataStream.on("error", (error: any) => {
                outStream.emit("error", error);
            });
        }
        return outStream;
    }

    public getRawData = async (): Promise<any> => {
        try {
            const result = request(this.connectionSettings);

            if (this.connectionSettings.isGunZipped) {
                throw new Error("gZipped resources are not supported in HTTPProtocolStrategyStreamed yet");
            }

            if (this.connectionSettings.isCompressed) {
                throw new Error("Compressed resources are not supported in HTTPProtocolStrategyStreamed yet");
            }

            return {
                data: result,
            };
        } catch (err) {
            throw new CustomError("Error while getting data from server.", true, this.constructor.name, 2002, err);
        }
    }
}
