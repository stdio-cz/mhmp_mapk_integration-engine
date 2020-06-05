"use strict";

import * as path from "path";

/// Path to config files directory
const FILES_DIR = "../../../config/";
/// Config files extension
const FILES_EXT = ".json";

/**
 * Helper class for loading and merging default and specific config files.
 */
export class ConfigLoader {

    /** Object with configurations */
    public conf: any;

    /**
     * Constructor
     *
     * @param {string} filename Filename of the configuration file.
     * @param {boolean} replaceDefault If is true then the default and specific configs are NOT MERGED.
     */
    constructor(filename: string, replaceDefault: boolean = false) {
        let conf: any;
        let defaultConf: any;
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

        /// conf is exported (defaultConf is not included)
        if (replaceDefault && conf) {
            this.conf = conf;
        /// merging objects defaultConf and conf for export
        } else if (conf) {
            this.conf = { ...defaultConf, ...conf };
        /// only defaultConf is exported
        } else {
            this.conf = defaultConf;
        }
    }
}

/** Exporting all configurations */
export const config = { // TODO prejmenovat na lower-case
    DATA_BATCH_SIZE: process.env.DATA_BATCH_SIZE || 1000,
    HOPPYGO_BASE_URL: process.env.HOPPYGO_BASE_URL,
    LOG_LEVEL: process.env.LOG_LEVEL,
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
    app_version: process.env.npm_package_version,
    datasources: new ConfigLoader("datasources").conf as {[key: string]: any},
    influx_db: {
        database: process.env.INFLUX_DB_DATABASE,
        enabled: (process.env.INFLUX_DB_ENABLED === "true") ? true : false,
        hosts: [
            {
                host: process.env.INFLUX_DB_HOST,
                port: parseInt(process.env.INFLUX_DB_PORT, 10),
            },
        ],
        password: process.env.INFLUX_DB_PASSWORD,
        username: process.env.INFLUX_DB_USERNAME,
    },
    port: process.env.PORT,
    queuesBlacklist: new ConfigLoader("queuesBlacklist", true).conf as {[dataset: string]: string[]},
    s3: {
        access_key_id: process.env.S3_ACCESS_KEY_ID,
        bucket_name: process.env.S3_BUCKET_NAME,
        enabled: (process.env.S3_ENABLED === "true") ? true : false,
        endpoint: process.env.S3_ENDPOINT,
        secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
        upload_part_size: parseInt(process.env.S3_UPLOAD_PART_SIZE, 10) || 10, // in MB, default 10 MB
        upload_queue_size: parseInt(process.env.S3_UPLOAD_QUEUE_SIZE, 10) || 2, // concurrency uploading, default 2
    },
    saveRawDataWhitelist: new ConfigLoader("saveRawDataWhitelist", true).conf as {[key: string]: any},
};
