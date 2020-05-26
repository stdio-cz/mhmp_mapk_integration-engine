"use strict";

import { config } from "../../core/config";

import { CustomError } from "@golemio/errors";
import { DataSourceStream } from "./DataSourceStream";

import { MySequelize } from "../connectors";
import { IProtocolStrategy, PostgresProtocolStrategy } from "./";

export class PostgresProtocolStrategyStreamed extends PostgresProtocolStrategy implements IProtocolStrategy {

    public getData = async (): Promise<DataSourceStream> => {
        const findOptions = this.connectionSettings.findOptions;

        let batchLimit: number;
        let dbConnectionOpened = false;
        let offset = (this.connectionSettings.findOptions || {}).offset || 0;
        const limit = (this.connectionSettings.findOptions || {}).limit;
        let gotAllData = false;
        let resultsCount = 0;

        // TO DO - move to helper f-cion
        if (limit && limit <= config.DATA_BATCH_SIZE) {
            batchLimit = limit;
        } else {
            batchLimit = +config.DATA_BATCH_SIZE;
        }

        try {
            const connector = new MySequelize();
            const connection = await connector.connect(this.connectionSettings.connectionString);
            dbConnectionOpened = true;

            const model = connection.define(
                this.connectionSettings.tableName,
                this.connectionSettings.modelAttributes,
                {
                    ...((this.connectionSettings.sequelizeAdditionalSettings)
                        ? this.connectionSettings.sequelizeAdditionalSettings
                        : { freezeTableName: true, timestamps: true, underscored: true }), // default values
                    ...((this.connectionSettings.schemaName)
                        ? { schema: this.connectionSettings.schemaName }
                        : {}),
                },
            );

            return new DataSourceStream({
                objectMode: true,
                async read() {
                    try {
                        const results = await model
                            .findAll({
                                ...findOptions,
                                limit: batchLimit,
                                offset,
                                raw: true,
                            });

                        // some data in correct format
                        if (results && Array.isArray(results) && results.length !== 0) {
                            resultsCount += results.length;
                            this.push(results);
                            // but less than requested amount
                            if (results.length < batchLimit) {
                                gotAllData = true;
                            }
                        }  else {
                            gotAllData = true;
                        }

                        // requested data count reached
                        if (limit && resultsCount >= limit) {
                            gotAllData = true;
                        }

                        if (gotAllData) {
                            // end the stream
                            this.push(null);

                            if (dbConnectionOpened) {
                                await connection.close();
                                dbConnectionOpened = false;
                            }
                        } else {
                            offset += batchLimit;
                            // select min(remaining,batch size) in next round
                            batchLimit = (limit - resultsCount) < batchLimit ? limit - resultsCount : batchLimit;
                        }
                    } catch (err) {
                        this.emit("error", err);
                    }
                },
                async destroy() {
                    if (dbConnectionOpened) {
                        try {
                            await connection.close();
                            dbConnectionOpened = false;
                        } catch (err) {
                            this.emit("error", err);
                        }
                    }
                },
            });

        } catch (err) {
            throw new CustomError("Error while getting data from server.", true, this.constructor.name, 2002, err);
        }
    }
}
