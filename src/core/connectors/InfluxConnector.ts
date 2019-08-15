"use strict";

import { CustomError, ErrorHandler } from "@golemio/errors";
import { config } from "../config";
import { log } from "../helpers";

const Influx = require("influx");

class MyInflux {

    private influx: any;

    public connect = async (schemas: any[]): Promise<any> => {
        try {
            if (this.influx) {
                return this.influx;
            }

            this.influx = new Influx.InfluxDB({
                database: config.influx_db.database,
                host: config.influx_db.host,
                password: config.influx_db.password,
                port: config.influx_db.port,
                schema: schemas,
                username: config.influx_db.username,
            });

            const names = await this.influx.getDatabaseNames();
            if (!names.includes(config.influx_db.database)) {
                await this.influx.createDatabase(config.influx_db.database, { duration: "7d" });
            }
            log.info("Connected to InfluxDB!");
            return this.influx;
        } catch (err) {
            ErrorHandler.handle(new CustomError("Error while connecting to InfluxDB.", false, undefined, err));
        }
    }

    public getConnection = (): any => {
        if (!this.influx) {
            throw new CustomError("InfluxDB connection not exists. Firts call connect() method.", false, undefined);
        }
        return this.influx;
    }

}

const InfluxConnector = new MyInflux();

export { InfluxConnector };
