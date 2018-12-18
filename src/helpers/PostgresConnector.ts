"use strict";

import * as Sequelize from "sequelize";
import CustomError from "./errors/CustomError";
import handleError from "./errors/ErrorHandler";

const config = require("../config/ConfigLoader");
const log = require("debug")("data-platform:integration-engine:connection");

class MySequelize {

    private sequelize: Sequelize.Sequelize;

    public connect = (): Sequelize.Sequelize => {
        try {
            if (this.sequelize) {
                return this.sequelize;
            }

            this.sequelize = new Sequelize(config.POSTGRES_CONN, {
                define: {
                    freezeTableName: true,
                    timestamps: false,
                },
                logging: require("debug")("sequelize"), // logging by debug
                operatorsAliases: false, // disable aliases
                pool: {
                    acquire: 60000,
                    idle: 10000,
                    max: 5,
                    min: 0,
                },
            });
            log("Connected to PostgresSQL!");
            return this.sequelize;
        } catch (err) {
            handleError(new CustomError("Error while connecting to PostgresSQL.", false,
                this.constructor.name, undefined, err));
        }
    }
}

module.exports.sequelizeConnection = new MySequelize().connect();
