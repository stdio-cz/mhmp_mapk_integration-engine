"use strict";

import ISchema from "../schemas/ISchema";

export default interface IDataSource {

    /** The name of the data source. */
    name: string;

    /**
     * Gets raw data, validates them and sends as a response.
     *
     * @returns {Promise<{}>} Promise with received data.
     */
    GetAll(): Promise<{}>;

    /**
     * Gets raw data, validates them.
     * If they are valid, searches for specific element within and sends it as a response.
     *
     * @param {any} inId Identifier of the specific element.
     * @returns {Promise<{}>} Promise with received data.
     */
    GetOne(inId: any): Promise<{}>;
}
