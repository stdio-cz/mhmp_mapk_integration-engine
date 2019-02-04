"use strict";

const debugLog = require("debug")("data-platform:integration-engine:debug");
const infoLog = require("debug")("data-platform:integration-engine:info");
const warnLog = require("debug")("data-platform:integration-engine:warning");
const errorLog = require("debug")("data-platform:integration-engine:error");
const fatalLog = require("debug")("data-platform:integration-engine:fatal-error");

const config = require("../config/ConfigLoader");

/**
 * Defines methods which determines the importance of the log messages.
 * Each method returns true or false based on the LOG_LEVEL value.
 */
class Logger {

    /** Define standard log levels */
    private logLevels: any;

    constructor() {
        this.logLevels = {
            ALL: 0,
            DEBUG: 2,
            ERROR: 5,
            FATAL: 6,
            INFO: 3,
            OFF: 7,
            SILLY: 1,
            WARN: 4,
        };
    }

    public silly = (logText: string): boolean => {
        if (config.LOG_LEVEL === undefined || this.logLevels[config.LOG_LEVEL] <= this.logLevels.SILLY) {
            debugLog("[SILLY] " + logText);
            return true;
        }
        return false;
    }

    public debug = (logText: string): boolean => {
        if (config.LOG_LEVEL === undefined || this.logLevels[config.LOG_LEVEL] <= this.logLevels.DEBUG) {
            debugLog("[DEBUG] " + logText);
            return true;
        }
        return false;
    }

    public info = (logText: string): boolean => {
        if (config.LOG_LEVEL === undefined || this.logLevels[config.LOG_LEVEL] <= this.logLevels.INFO) {
            infoLog("[INFO] " + logText);
            return true;
        }
        return false;
    }

    public warn = (logText: string): boolean => {
        if (config.LOG_LEVEL === undefined || this.logLevels[config.LOG_LEVEL] <= this.logLevels.WARN) {
            warnLog("[WARN] " + logText);
            return true;
        }
        return false;
    }

    public error = (logText: string): boolean => {
        if (config.LOG_LEVEL === undefined || this.logLevels[config.LOG_LEVEL] <= this.logLevels.ERROR) {
            errorLog("[ERROR] " + logText);
            return true;
        }
        return false;
    }

    public fatal = (logText: string): boolean => {
        if (config.LOG_LEVEL === undefined || this.logLevels[config.LOG_LEVEL] <= this.logLevels.FATAL) {
            fatalLog("[FATAL] " + logText);
            return true;
        }
        return false;
    }
}

export default new Logger();
