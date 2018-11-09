"use strict";

export default interface IDataSource {

    /** The name of the data source. */
    name: string;

    /**
     * Gets raw data, validates them and sends as a response.
     *
     * @returns {Promise<any>} Promise with received data.
     */
    GetAll(): Promise<any>;

    /**
     * Gets raw data, validates them.
     * If they are valid, searches for specific element within and sends it as a response.
     *
     * @param {any} inId Identifier of the specific element.
     * @returns {Promise<any>} Promise with received data.
     */
    GetOne(inId: any): Promise<any>;
}
