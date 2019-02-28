"use strict";

import * as Sequelize from "sequelize";
import CustomError from "./errors/CustomError";
import log from "./Logger";

const config = require("../config/ConfigLoader");

class MySequelize {

    private connection: Sequelize.Sequelize;

    public connect = async (): Promise<Sequelize.Sequelize> => {
        try {
            if (this.connection) {
                return this.connection;
            }

            this.connection = new Sequelize(config.POSTGRES_CONN, {
                define: {
                    freezeTableName: true,
                    timestamps: false,
                },
                logging: log.silly, // logging by Logger::silly
                operatorsAliases: false, // disable aliases
                pool: {
                    acquire: 60000,
                    idle: 10000,
                    max: 25,
                    min: 0,
                },
            });
            await this.connection.authenticate();
            log.info("Connected to PostgresSQL!");
            return this.connection;
        } catch (err) {
            throw new CustomError("Error while connecting to PostgresSQL.", false,
                this.constructor.name, undefined, err);
        }
    }

    public getConnection = (): Sequelize.Sequelize => {
        if (!this.connection) {
            throw new CustomError("Sequelize connection not exists. Firts call connect() method.", false,
                this.constructor.name, undefined);
        }
        return this.connection;
    }
}

module.exports.PostgresConnector = new MySequelize();
