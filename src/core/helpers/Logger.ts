"use strict";

import { CustomError, ErrorHandler } from "@golemio/errors";
import { config } from "../config";
import { InfluxConnector } from "../connectors";

const { EventEmitter } = require("events");

const sillyLog = require("debug")("golemio:integration-engine:silly");
const debugLog = require("debug")("golemio:integration-engine:debug");
const winston = require("winston");
const { combine, timestamp, printf, colorize, align } = winston.format;

const logFormat = (info: any) => {
    return `[${info.timestamp}] [${info.level}]: ${info.message}`;
};

const logLevelToSet = config.LOG_LEVEL ? config.LOG_LEVEL.toLowerCase() : "info";

const loggerEvents = new EventEmitter();

enum LoggerEventType {
    NumberOfRecords = "number-of-records",
}

interface ILoggerEventNumberOfRecordsInputType {
    name: string;
    numberOfRecords: number;
}

/**
 * Winston logger setup
 */
const setFormat = combine(
        timestamp(),
        colorize(),
        align(),
        printf(logFormat),
    );

const logger = winston.createLogger({
    format: setFormat,
    transports: [
      new winston.transports.Console({ level: logLevelToSet }),
    ],
});

const winstonDebugLog = logger.debug;
const winstonSillyLog = logger.silly;

// Log all "SILLY" logs also to debug module
logger.silly = (logText: any) => {
    sillyLog(logText);
    winstonSillyLog(logText);
};

// Log all "DEBUG" logs also to debug module
logger.debug = (logText: any) => {
    debugLog(logText);
    winstonDebugLog(logText);
};

loggerEvents.on(LoggerEventType.NumberOfRecords,
        async ({ name, numberOfRecords }: ILoggerEventNumberOfRecordsInputType) => {
    if (config.influx_db.enabled) {
        const influxDB = InfluxConnector.getConnection();
        try {
            await influxDB.writePoints([{
                fields: {
                    number_of_records: numberOfRecords,
                },
                measurement: "number_of_records",
                tags: {
                    name,
                },
            }]);
        } catch (err) {
            loggerEvents.emit("error", new CustomError("Error while saving data to InfluxDB.", true,
                    LoggerEventType.NumberOfRecords, 1004, err));
        }
    } else {
        logger.verbose(`NumberOfRecordsLogger: ${name} : ${numberOfRecords}`);
    }
});

loggerEvents.on("error", (error: Error | CustomError) => {
    ErrorHandler.handle(error);
});

export { logger as log, loggerEvents, LoggerEventType };
