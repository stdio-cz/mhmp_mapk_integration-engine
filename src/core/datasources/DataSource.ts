"use strict";

import { log, loggerEvents, LoggerEventType, Validator } from "../helpers";
import { CustomError } from "../helpers/errors";
import { IDataSource, IDataTypeStrategy, IProtocolStrategy } from "./";

export class DataSource implements IDataSource {

    public name: string;
    private protocolStrategy: IProtocolStrategy;
    private dataTypeStrategy: IDataTypeStrategy;
    private validator: Validator;

    constructor(
            name: string,
            protocolStrategy: IProtocolStrategy,
            dataTypeStrategy: IDataTypeStrategy,
            validator: Validator) {
        this.name = name;
        this.protocolStrategy = protocolStrategy;
        this.dataTypeStrategy = dataTypeStrategy;
        this.validator = validator;
    }

    public setProtocolStrategy = (strategy: IProtocolStrategy): void => {
        this.protocolStrategy = strategy;
    }

    public setDataTypeStrategy = (strategy: IDataTypeStrategy): void => {
        this.dataTypeStrategy = strategy;
    }

    public setValidator = (validator: Validator): void => {
        this.validator = validator;
    }

    public getAll = async (): Promise<any> => {
        const data = await this.getRawData();
        if (this.validator) {
            await this.validator.Validate(data);
        } else {
            log.warn("DataSource validator is not set.");
        }
        return data;
    }

    public getLastModified = async (): Promise<string> => {
        return this.protocolStrategy.getLastModified();
    }

    protected getRawData = async (): Promise<any> => {
        try {
            const body = await this.protocolStrategy.getData();
            const content = await this.dataTypeStrategy.parseData(body);
            if (this.isEmpty(content)) {
                log.warn("Data source returned empty data.");
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
            return content;
        } catch (err) {
            throw new CustomError("Retrieving of the source data failed.", true, this.name, 1002, err);
        }
    }

    private isEmpty = (content: any): boolean => {
        if (!content) {
            return true;
        } else if (content instanceof Array && content.length === 0) {
            return true;
        } else if (content instanceof Object && Object.keys(content).length === 0) {
            return true;
        }
        return false;
    }
}
