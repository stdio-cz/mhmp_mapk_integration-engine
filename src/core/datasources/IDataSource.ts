"use strict";

import { Validator } from "@golemio/validator";
import { IDataTypeStrategy, IProtocolStrategy } from "./";

export interface IDataSource {

    /** The name of the data source. */
    name: string;

    setProtocolStrategy(strategy: IProtocolStrategy): void;

    setDataTypeStrategy(strategy: IDataTypeStrategy): void;

    setValidator(validator: Validator): void;

    /**
     * Gets raw data, validates them and sends as a response.
     *
     * @returns {Promise<any>} Promise with received data.
     */
    getAll(): Promise<any>;

    getLastModified(): Promise<string>;

}
