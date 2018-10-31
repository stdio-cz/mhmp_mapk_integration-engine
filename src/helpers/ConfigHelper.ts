"use strict";

const warning = require("debug")("data-platform:integration-engine:warning");

class ConfigHelper {

    private filename: string;
    private conf: object;
    private defaultConf: object;

    constructor(filename) {
        this.filename = filename;
        try {
            this.conf = require("../../config/" + filename + ".js");
            this.defaultConf = require("../../config/" + filename + ".default.js");
        } catch (err) {
            this.conf = null;
            this.defaultConf = require("../../config/" + filename + ".default.js");
        }
    }

    public getVar = (name: string): any => {
        if (!this.conf || !this.conf[name]) {
            warning("The config file '" + this.filename + "' was not loaded. "
                + "The default value of '" + name + "' was used.");
            return this.defaultConf[name];
        }
        return this.conf[name];
    }

}

/**
 * This enable to use require with arguments
 * e.g. const confHelper = require('./ConfigHelper')('path/to/file')
 */
export = (filename) => {
    return new ConfigHelper(filename);
};
