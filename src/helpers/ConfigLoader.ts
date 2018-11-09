"use strict";

import * as path from "path";

/**
 * Helper for loading and merging default and specific config files.
 */
class ConfigLoader {

    /** Object with configurations */
    public conf: object;
    /** Path to directory with config files */
    private configDirPath: string;

    /**
     * Constructor
     *
     * @param {string} filename Filename of the configuration file.
     */
    constructor(filename: string) {
        this.configDirPath = "../../config/";
        let conf: object = {};
        let defaultConf: object = {};
        try {
            conf = require(path.join(this.configDirPath, filename + ".js"));
            defaultConf = require(path.join(this.configDirPath, filename + ".default.js"));
        } catch (err) {
            defaultConf = require(path.join(this.configDirPath, filename + ".default.js"));
        }
        /// merging objects defaultConf and conf for export
        this.conf = { ...defaultConf, ...conf };
    }
}

module.exports = {
    datasources: new ConfigLoader("datasources").conf,
    refreshtimes: new ConfigLoader("refreshtimes").conf,
};
