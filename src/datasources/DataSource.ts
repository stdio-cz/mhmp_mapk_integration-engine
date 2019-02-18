"use strict";

import log from "../helpers/Logger";
import Validator from "../helpers/Validator";
import IDataSource from "./IDataSource";
import { IDataTypeStrategy } from "./IDataTypeStrategy";
import { IProtocolStrategy } from "./IProtocolStrategy";

export default class DataSource implements IDataSource {

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
        return content;
    }

}
