"use strict";

import { CustomError, ErrorHandler } from "@golemio/errors";
import { InfluxDB } from "influx";
import { config } from "../config";
import { log } from "../helpers";

class MyInflux {

    private influx: any;

    public connect = async (schemas: any[]): Promise<any> => {
        try {
            if (this.influx) {
                return this.influx;
            }

            this.influx = new InfluxDB({
                database: config.influx_db.database,
                hosts: config.influx_db.hosts,
                password: config.influx_db.password,
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
            throw new CustomError("Error while connecting to InfluxDB.", false,
                this.constructor.name, 1001, err);
        }
    }

    public getConnection = (): any => {
        if (!this.influx) {
            throw new CustomError("InfluxDB connection not exists. Firts call connect() method.", false,
                this.constructor.name, 1002);
        }
        return this.influx;
    }

}

const InfluxConnector = new MyInflux();

export { InfluxConnector };
