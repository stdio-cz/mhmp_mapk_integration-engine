"use strict";

import { CustomError } from "@golemio/errors";
import { Readable } from "stream";
import { log, loggerEvents, LoggerEventType } from "../helpers";
import { DataSource, IDataSource, IDataTypeStrategy, IProtocolStrategy } from "./";

export class DataSourceStreamed extends DataSource implements IDataSource {

    public getAll = async (): Promise<Readable> => {
        const dataStream = await this.getRawData();
        dataStream.on("data", async (data: any) => {
            if (this.validator) {
                dataStream.pause();
                try {
                    await this.validator.Validate(data);
                } catch (err) {
                    throw new CustomError("Error while validating source data.", true, this.name, 2004, err);
                }
                dataStream.resume();
            } else {
                log.warn("DataSource validator is not set.");
            }
        });

        return dataStream;
    }

    protected getRawData = async (): Promise<Readable> => {
        const dataStream = await this.protocolStrategy.getData();

        dataStream.on("data", async (data: any) => {
            dataStream.pause();
            try {
                const content = await this.dataTypeStrategy.parseData(data);
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
            dataStream.resume();
        });

        dataStream.on("end", () => {
            dataStream.destroy();
        });

        return dataStream;
    }
}
