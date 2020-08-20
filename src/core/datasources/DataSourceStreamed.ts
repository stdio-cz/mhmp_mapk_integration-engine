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
            inputStream.pause();

            if (useDataBuffer) {
                this.dataBuffer.push(data);
                await this.processData();
            } else {
                await this.processData(false, data);
            }

            inputStream.resume();
        });

        inputStream.on("end", async (): Promise<void>  => {
            if (useDataBuffer) {
                await this.processData(true);
            }
            // end the stream
            this.dataStream.push(null);
        });

        inputStream.proceed();

        return this.dataStream;
    }

    private processData = async (force = false, data = null): Promise<void> => {
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
                }
            } catch (err) {
                this.dataStream.emit(
                    "error",
                    new CustomError("Retrieving of the source data failed.", true, this.name, 2001, err),
                );
            }
        }
    }
}
