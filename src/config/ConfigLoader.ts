"use strict";

/**
 * Helper for loading and merging default and specific config files.
 */
class ConfigLoader {

    /** Object with configurations */
    public conf: object;

    /**
     * Constructor
     *
     * @param {string} filename Filename of the configuration file.
     */
    constructor(filename: string) {
        let conf: object = {};
        let defaultConf: object = {};
        try {
            conf = require("./" + filename);
            defaultConf = require("./" + filename + ".default");
        } catch (err) {
            defaultConf = require("./" + filename + ".default");
        }
        /// merging objects defaultConf and conf for export
        this.conf = { ...defaultConf, ...conf };
    }
}

module.exports = {
    MONGO_CONN: process.env.MONGO_CONN,
    NODE_ENV: process.env.NODE_ENV,
    OPEN_STREET_MAP_API_URL: process.env.OPEN_STREET_MAP_API_URL,
    PARKINGS_PAYMENT_URL: process.env.PARKINGS_PAYMENT_URL,
    POSTGRES_CONN: process.env.POSTGRES_CONN,
    RABBIT_CONN: process.env.RABBIT_CONN,
    RABBIT_EXCHANGE_NAME: process.env.RABBIT_EXCHANGE_NAME,
    SPARQL_ENDPOINT_AUTH: process.env.SPARQL_ENDPOINT_AUTH,
    SPARQL_ENDPOINT_URL: process.env.SPARQL_ENDPOINT_URL,
    datasources: new ConfigLoader("datasources").conf,
    refreshtimes: new ConfigLoader("refreshtimes").conf,
};
