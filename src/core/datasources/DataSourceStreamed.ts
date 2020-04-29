"use strict";

import { CustomError } from "@golemio/errors";
import { DataSourceStream } from "./DataSourceStream";

import { log, loggerEvents, LoggerEventType } from "../helpers";
import { DataSource, IDataSource } from "./";

export class DataSourceStreamed extends DataSource implements IDataSource {

    public proceed = (): void => {
        this.dataStream.emit("streamReady");
    }

    public getAll = async (): Promise<DataSourceStream> => {
        this.dataStream = await this.getRawData();

        this.dataStream.on("streamReady", () => {
            this.dataStream.onDataListeners.forEach((listener) => {
                this.dataStream.on("data", listener);
            });
        });

        this.dataStream.on("end", () => {
            this.dataStream.destroy();
        });

        this.dataStream.onDataListeners.push(async (data: any) => {
            if (this.validator) {
                this.dataStream.pause();
                try {
                    await this.validator.Validate(data);
                } catch (err) {
                    throw new CustomError("Error while validating source data.", true, this.name, 2004, err);
                }
                this.dataStream.resume();
            } else {
                log.warn("DataSource validator is not set.");
            }
        });

        return this.dataStream;
    }

    protected getRawData = async (): Promise<DataSourceStream> => {
        this.dataStream =  new DataSourceStream({
            objectMode: true,
            read: () => {
                return;
            },
        });
        const inputStream = await this.protocolStrategy.getData();

        let content: any;

        inputStream.on("data", async ( data: any ): Promise<void> => {
            try {
                content = await this.dataTypeStrategy.parseData(data);
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
                }
            } catch (err) {
                throw new CustomError("Retrieving of the source data failed.", true, this.name, 2001, err);
            }
            this.dataStream.push(content);
        });

        inputStream.on("end", () => {
            this.dataStream.push(null);
        });

        return this.dataStream;
    }
}
