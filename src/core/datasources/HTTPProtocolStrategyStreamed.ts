"use strict";

import { CustomError } from "@golemio/errors";
import { HTTPProtocolStrategy, IProtocolStrategy} from "./";

import request = require("request");

export class HTTPProtocolStrategyStreamed extends HTTPProtocolStrategy implements IProtocolStrategy {

    private streamTransform: any;

    /**
     * @param {TransformStream} streamTransform data will be piped  to this stream if provided
     */
    public setStreamTransformer = (streamTransform): void => {
        this.streamTransform = streamTransform;
    }

    public getData = async (): Promise<any> => {
        try {
            const result = request(this.connectionSettings);

            if (this.connectionSettings.isGunZipped) {
                throw new Error("gZipped resources are not supported in HTTPProtocolStrategyStreamed yet");
            }

            if (this.connectionSettings.isCompressed) {
                throw new Error("Compressed resources are not supported in HTTPProtocolStrategyStreamed yet");
            }

            if (this.streamTransform) {
                result.on("data", (data) => {
                    this.streamTransform.write(data);
                });
                result.on("close", (data) => {
                    this.streamTransform.end();
                });
                return this.streamTransform;

            }
            return result;
        } catch (err) {
            throw new CustomError("Error while getting data from server.", true, this.constructor.name, 2002, err);
        }
    }
}
