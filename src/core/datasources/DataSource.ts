"use strict";

import { CustomError } from "@golemio/errors";
import { Validator } from "@golemio/validator";
import { log, loggerEvents, LoggerEventType } from "../helpers";
import { IDataSource, IDataTypeStrategy, IProtocolStrategy } from "./";

export class DataSource implements IDataSource {

    public name: string;
    protected protocolStrategy: IProtocolStrategy;
    protected dataTypeStrategy: IDataTypeStrategy;
    protected validator: Validator;

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
            try {
                await this.validator.Validate(data);
            } catch (err) {
                throw new CustomError("Error while validating source data.", true, this.name, 2004, err);
            }
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
            return content;
        } catch (err) {
            throw new CustomError("Retrieving of the source data failed.", true, this.name, 2001, err);
        }
    }

    protected isEmpty = (content: any): boolean => {
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
