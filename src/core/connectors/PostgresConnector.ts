"use strict";

import { CustomError } from "@golemio/errors";
import * as Sequelize from "sequelize";
import { config } from "../config";
import { log } from "../helpers";

class MySequelize {

    private connection: Sequelize.Sequelize | undefined;

    public connect = async (): Promise<Sequelize.Sequelize> => {
        try {
            if (this.connection) {
                return this.connection;
            }

            if (!config.POSTGRES_CONN) {
                throw new CustomError("The ENV variable POSTGRES_CONN cannot be undefined.", true,
                    this.constructor.name, 6003);
            }

            this.connection = new Sequelize(config.POSTGRES_CONN, {
                define: {
                    freezeTableName: true,
                    timestamps: true, // adds createdAt and updatedAt
                    underscored: true, // automatically set field option for all attributes to snake cased name
                },
                logging: log.silly, // logging by Logger::silly
                operatorsAliases: false, // disable aliases
                pool: {
                    acquire: 60000,
                    idle: 10000,
                    max: Number(config.POSTGRES_POOL_MAX_CONNECTIONS) || 10,
                    min: 0,
                },
                retry: {
                    match: [
                        /SequelizeConnectionError/,
                        /SequelizeConnectionRefusedError/,
                        /SequelizeHostNotFoundError/,
                        /SequelizeHostNotReachableError/,
                        /SequelizeInvalidConnectionError/,
                        /SequelizeConnectionTimedOutError/,
                        /TimeoutError/,
                    ],
                    max: 8,
                },
            });

            if (!this.connection) {
                throw new Error("Connection is undefined.");
            }

            await this.connection.authenticate();
            log.info("Connected to PostgreSQL!");
            return this.connection;
        } catch (err) {
            throw new CustomError("Error while connecting to PostgreSQL.", false,
                this.constructor.name, 1001, err);
        }
    }

    public getConnection = (): Sequelize.Sequelize => {
        if (!this.connection) {
            throw new CustomError("Sequelize connection does not exist. First call connect() method.", false,
                this.constructor.name, 1002);
        }
        return this.connection;
    }
}

const PostgresConnector = new MySequelize();

export { PostgresConnector };
