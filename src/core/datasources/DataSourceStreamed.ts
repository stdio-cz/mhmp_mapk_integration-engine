"use strict";

import { config } from "../../core/config";

import { CustomError } from "@golemio/errors";
import { DataSourceStream } from "./DataSourceStream";

import { log, loggerEvents, LoggerEventType } from "../helpers";
import { DataSource, IDataSource } from "./";

export class DataSourceStreamed extends DataSource implements IDataSource {

    private dataBuffer = [];

    public proceed = (): void => {
        this.dataStream.proceed();
    }

    public getAll = async (useDataBuffer = false): Promise<DataSourceStream> => {
        this.dataStream = await this.getOutputStream(useDataBuffer);

        this.dataStream.on("end", () => {
            this.dataStream.destroy();
        });

        this.dataStream.onDataListeners.push(async (data: any) => {
            if (this.validator) {
                this.dataStream.pause();
                try {
                    await this.validator.Validate(data);
                } catch (err) {
                    this.dataStream.emit(
                        "error",
                        new CustomError("Error while validating source data.", true, this.name, 2004, err),
                    );
                }
                this.dataStream.resume();
            } else {
                log.warn("DataSource validator is not set.");
            }
        });

        return this.dataStream;
    }

    /**
     * @param {boolean} useDataBuffer data  is buffered and sent to output stream in `config.DATA_BATCH_SIZE` batches
     */
    protected getOutputStream = async (useDataBuffer: boolean = false): Promise<DataSourceStream> => {
        let inputStreamEndedAttempts = 0;
        this.dataStream =  new DataSourceStream({
            objectMode: true,
            read: () => {
                return;
            },
        });

        const inputStream = await this.protocolStrategy.getData();

        inputStream.on("error", (error) => {
            this.dataStream.emit("error", error);
        });

        inputStream.onDataListeners.push(async ( data: any ): Promise<void> => {
            let somethingToProcess = false;
            inputStream.pause();

            if (useDataBuffer) {
                this.dataBuffer.push(data);
                somethingToProcess = await this.processData();
            } else {
                somethingToProcess = await this.processData(false, data);
            }

            if (somethingToProcess) {
                const checker = setInterval(async () => {
                    // wait till batch is processed
                    if (!this.dataStream.processing) {
                        clearInterval(checker);
                        inputStream.resume();
                    }
                }, 100);
            } else {
                inputStream.resume();
            }
        });

        inputStream.on("end", async (): Promise<void>  => {
            if (useDataBuffer) {
                await this.processData(true);
            }

            if (!inputStream.isPaused()) {
                this.dataStream.push(null);
            } else {
                const checker = setInterval(() => {
                    inputStreamEndedAttempts++;
                    // wait till all data is processed
                    if (!inputStream.isPaused()) {
                        clearInterval(checker);
                        this.dataStream.push(null);
                    } else if (inputStreamEndedAttempts > config.stream.wait_for_end_attempts) {
                        this.dataStream.emit(
                            "error",
                            new CustomError("Data Source stream has not ended", true, this.name, 2001),
                        );
                        this.dataStream.push(null);
                        clearInterval(checker);
                    }
                }, config.stream.wait_for_end_interval);
            }
        });

        try {
            inputStream.proceed();
        } catch (error) {
            this.dataStream.emit("error", error);
        }

        return this.dataStream;
    }

    private processData = async (force = false, data = null): Promise<boolean> => {
        if ((this.dataBuffer.length >= config.DATA_BATCH_SIZE) || force || data) {
            try {
                let content: any;

                if (this.dataTypeStrategy?.parseData) {
                    content = await this.dataTypeStrategy.parseData(data || this.dataBuffer);
                } else {
                    content = data || this.dataBuffer;
                }

                if (this.isEmpty(content)) {
                    log.warn(`${this.name}: Data source returned empty data.`);
                    // logging number of records
                    loggerEvents.emit(
                        LoggerEventType.NumberOfRecords, { name: this.name, numberOfRecords: 0 });
                } else {
                    if (content instanceof Array) {
                        // logging number of records
                        loggerEvents.emit(
                            LoggerEventType.NumberOfRecords, { name: this.name, numberOfRecords: content.length });
                    } else {
                        // logging number of records
                        loggerEvents.emit(
                            LoggerEventType.NumberOfRecords, { name: this.name, numberOfRecords: 1 });
                    }

                    this.dataStream.push(content);
                    // clear the buffer
                    this.dataBuffer.length = 0;
                    return true;
                }
            } catch (err) {
                this.dataStream.emit(
                    "error",
                    new CustomError("Retrieving of the source data failed.", true, this.name, 2001, err),
                );
            }
        } else {
            return false;
        }
    }
}
