"use strict";

import { CustomError } from "@golemio/errors";
import { DataSourceStream, HTTPProtocolStrategy, IProtocolStrategy} from "./";

import request = require("request");

export class HTTPProtocolStrategyStreamed extends HTTPProtocolStrategy implements IProtocolStrategy {

    private streamTransform: any;

    /**
     * @param {TransformStream} streamTransform data will be piped  to this stream if provided
     */
    public setStreamTransformer = (streamTransform): void => {
        this.streamTransform = streamTransform;
    }

    public async getData(): Promise<DataSourceStream>  {
        const dataStream = await super.getData();

        const outStream =  new DataSourceStream({
            objectMode: true,
            read: () => {
                return;
            },
        });

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
        } else {
            dataStream.on("data", (data: any) => {
                outStream.push(data);
            });
            dataStream.on("close", () => {
                outStream.push(null);
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

            return result;
        } catch (err) {
            throw new CustomError("Error while getting data from server.", true, this.constructor.name, 2002, err);
        }
    }
}
