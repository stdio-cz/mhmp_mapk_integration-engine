"use strict";

const warning = require("debug")("data-platform:integration-engine:warning");

class ConfigLoader {

    public conf: object;

    constructor(filename) {
        let conf = {};
        let defaultConf = {};
        try {
            conf = require("../../config/" + filename + ".js");
            defaultConf = require("../../config/" + filename + ".default.js");
        } catch (err) {
            defaultConf = require("../../config/" + filename + ".default.js");
        }
        this.conf = { ...defaultConf, ...conf };
    }
}

module.exports = {
    datasources: new ConfigLoader("datasources").conf,
    refreshtimes: new ConfigLoader("refreshtimes").conf,
};
