"use strict";

import * as Sequelize from "sequelize";
import CustomError from "./errors/CustomError";
import handleError from "./errors/ErrorHandler";

const config = require("../config/ConfigLoader");
const log = require("debug")("data-platform:integration-engine");

class MySequelize {

    public connect = (): Sequelize.Sequelize => {
        try {
            const sequelize = new Sequelize(config.POSTGRES_CONN, {
                define: {
                    timestamps: false,
                },
                logging: require("debug")("sequelize"), // logging by debug
                operatorsAliases: false, // disable aliases
                pool: {
                    acquire: 60000,
                    idle: 30000,
                    max: 5,
                },
            });
            log("Connected to PostgresSQL!");
            return sequelize;
        } catch (err) {
            handleError(new CustomError("Error while connecting to PostgresSQL.", false,
                this.constructor.name, undefined, err));
        }
    }
}

module.exports.sequelizeConnection = new MySequelize().connect();
