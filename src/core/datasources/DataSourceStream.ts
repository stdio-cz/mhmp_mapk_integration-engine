import { Readable } from "stream";

import { CustomError } from "@golemio/errors";
import { config } from "../../core/config";

export class DataSourceStream extends Readable {
    public onDataListeners = [];
    public processing = 0;
    private onEndFunction: () => Promise<void> = null;
    private streamEnded = false;

    constructor(...args: any) {
        super(...args);

        // to avoid data loss use proceed method or streamReady event to add on 'data' listeners
        this.on("streamReady", () => {
            this.onDataListeners.forEach((listener) => {
                this.on("data", listener);
            });
        });
    }

    public setOnEndFunction = (
        onEndFunction: () => Promise<void>,
    ): DataSourceStream => {
        this.onEndFunction = onEndFunction;
        return this;
    }

    public setDataProcessor = (
        onDataFunction: (data: any) => Promise<void>,
    ): DataSourceStream => {
        this.onDataListeners.push(async (data: any) => {

            this.processing++;
            this.pause();
            try {
                if (data instanceof Array) {
                    await onDataFunction([...data]);
                } else {
                    await onDataFunction(Object.assign({}, data));
                }
            } catch (err) {
                this.emit("error", err);
            }

            this.resume();
            this.processing--;
        });

        return this;
    }

    public waitForEnd = async (): Promise<void> => {
        let inputStreamEndedAttempts = 0;
        await new Promise((resolve, reject) => {
            this.on("error", (error) => reject(error));
            this.on("end", async () => {
                if (!this.processing && !this.streamEnded) {
                    this.streamEnded = true;
                    if (this.onEndFunction) {
                        await this.onEndFunction();
                    }
                    resolve();
                } else {
                    const checker = setInterval(async () => {
                        inputStreamEndedAttempts++;

                        if (!this.processing && !this.streamEnded) {
                            clearInterval(checker);
                            this.streamEnded = true;
                            if (this.onEndFunction) {
                                await this.onEndFunction();
                            }
                            resolve();
                        } else if (inputStreamEndedAttempts > config.stream.wait_for_end_attempts) {
                            this.emit(
                                "error",
                                new CustomError("Input stream has not ended", true, "DataSourceStream", 2001),
                            );
                            this.push(null);
                            clearInterval(checker);
                        }
                    }, config.stream.wait_for_end_interval);
                }
            });
        });
    }

    public proceed = async (): Promise<void> => {
        this.emit("streamReady");
        return this.waitForEnd();
    }
}
