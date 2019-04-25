"use strict";

import * as path from "path";

/// Path to config files directory
const FILES_DIR = "../../../config/";
/// Config files extension
const FILES_EXT = ".json";

/**
 * Helper for loading and merging default and specific config files.
 */
export class ConfigLoader {

    /** Object with configurations */
    public conf: any;

    /**
     * Constructor
     *
     * @param {string} filename Filename of the configuration file.
     */
    constructor(filename: string) {
        let conf: any = {};
        let defaultConf: any = {};
        try {
            try {
                conf = require(path.join(__dirname, FILES_DIR, filename + FILES_EXT));
                defaultConf = require(path.join(__dirname, FILES_DIR, filename + ".default" + FILES_EXT));
            } catch (err) {
                defaultConf = require(path.join(__dirname, FILES_DIR, filename + ".default" + FILES_EXT));
            }
        } catch (err) {
            throw new Error(`Default config '${filename}' was not found.`);
        }
        /// merging objects defaultConf and conf for export
        this.conf = { ...defaultConf, ...conf };
    }
}

// TODO prejmenovat na lower-case
export let config = {
    HOPPYGO_BASE_URL: process.env.HOPPYGO_BASE_URL,
    LOG_LEVEL: process.env.LOG_LEVEL,
    MOJEPRAHA_ENDPOINT_APIKEY: process.env.MOJEPRAHA_ENDPOINT_APIKEY,
    MOJEPRAHA_ENDPOINT_BASEURL: process.env.MOJEPRAHA_ENDPOINT_BASEURL,
    MONGO_CONN: process.env.MONGO_CONN,
    NODE_ENV: process.env.NODE_ENV,
    OPEN_STREET_MAP_API_URL_REVERSE: process.env.OPEN_STREET_MAP_API_URL_REVERSE,
    OPEN_STREET_MAP_API_URL_SEARCH: process.env.OPEN_STREET_MAP_API_URL_SEARCH,
    PARKINGS_PAYMENT_URL: process.env.PARKINGS_PAYMENT_URL,
    PARKING_ZONES_PAYMENT_URL: process.env.PARKING_ZONES_PAYMENT_URL,
    POSTGRES_CONN: process.env.POSTGRES_CONN,
    POSTGRES_POOL_MAX_CONNECTIONS: process.env.POSTGRES_POOL_MAX_CONNECTIONS,
    RABBIT_CONN: process.env.RABBIT_CONN,
    RABBIT_EXCHANGE_NAME: process.env.RABBIT_EXCHANGE_NAME,
    REDIS_CONN: process.env.REDIS_CONN,
    SPARQL_ENDPOINT_AUTH: process.env.SPARQL_ENDPOINT_AUTH,
    SPARQL_ENDPOINT_URL: process.env.SPARQL_ENDPOINT_URL,
    datasources: new ConfigLoader("datasources").conf,
    queuesBlacklist: new ConfigLoader("queuesBlacklist").conf,
};
