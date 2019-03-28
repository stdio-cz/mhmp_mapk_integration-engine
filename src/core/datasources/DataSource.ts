"use strict";

import { log, Validator } from "../helpers";
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
        const body = await this.protocolStrategy.getData();
        const content = await this.dataTypeStrategy.parseData(body);
        if (this.isEmpty(content)) {
            log.warn("Data source returned empty data.");
        }
        return content;
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
