"use strict";

import { CustomError, ErrorHandler } from "@golemio/errors";
import { ErrorLog } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import { config } from "../config";
import { InfluxConnector } from "../connectors";
import { PostgresModel } from "../models";

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
    PostgresErrorLog = "postgres-error-log",
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

/**
 * Postgres Error Log Model
 */
let pgErrorLogModel: PostgresModel;

/**
 * Postgres Error Log
 */
loggerEvents.on(LoggerEventType.PostgresErrorLog, async ({ error }: {error: Error | CustomError}) => {
    if (!pgErrorLogModel) {
        pgErrorLogModel = new PostgresModel(ErrorLog.name + "Model", {
                outputSequelizeAttributes: ErrorLog.outputSequelizeAttributes,
                pgTableName: ErrorLog.pgTableName,
                savingType: "insertOnly",
            },
            new Validator(ErrorLog.name + "ModelValidator", ErrorLog.outputMongooseSchemaObject),
        );
    }

    try {
        const transformedData = {
            class_name: null,
            info: null,
            message: error.message,
            service: "integration-engine",
            stack_trace: error.stack || null,
            status: null,
        };
        if (error instanceof CustomError) {
            const errorObject = error.toObject();
            transformedData.class_name = errorObject.error_class_name || null;
            transformedData.info = errorObject.error_info || null;
            transformedData.status = errorObject.error_status || null;
        }
        await pgErrorLogModel.save(transformedData);
    } catch (err) {
        loggerEvents.emit(err);
    }
});

export { logger as log, loggerEvents, LoggerEventType };
