"use strict";

import { VehiclePositions } from "data-platform-schema-definitions";
import * as Sequelize from "sequelize";
import CustomError from "../helpers/errors/CustomError";
import log from "../helpers/Logger";
import Validator from "../helpers/Validator";
import IModel from "./IModel";
import PostgresModel from "./PostgresModel";

const { PostgresConnector } = require("../helpers/PostgresConnector");
const moment = require("moment");

export default class VehiclePositionsTripsModel extends PostgresModel implements IModel {

    public name: string;
    protected sequelizeModel: Sequelize.Model<any, any>;
    protected validator: Validator;

    constructor() {
        super();
        this.name = VehiclePositions.trips.name;

        this.sequelizeModel = PostgresConnector.getConnection().define(VehiclePositions.trips.pgTableName,
            VehiclePositions.trips.outputSequelizeAttributes);
        this.validator = new Validator(this.name, VehiclePositions.trips.outputMongooseSchemaObject);
    }

    /**
     * Overrides PostgresModel::SaveToDb
     */
    public SaveToDb = async (data: any): Promise<{inserted: any[], updated: any[]}> => {
        // data validation
        if (this.validator) {
            await this.validator.Validate(data);
        }

        try {
            await this.sequelizeModel.sync();
            const i = []; // inserted
            const u = []; // updated

            if (data instanceof Array) {
                const promises = data.map(async (d) => {
                    const res = await this.sequelizeModel.upsert(d);
                    if (res) {
                        i.push({
                            cis_short_name: d.cis_short_name,
                            id: d.id,
                            start_cis_stop_id: d.start_cis_stop_id,
                            start_cis_stop_platform_code: d.start_cis_stop_platform_code,
                            start_timestamp: d.start_timestamp,
                        });
                    } else {
                        u.push(d.id);
                    }
                    return;
                });
                await Promise.all(promises);
                return { inserted: i, updated: u };
            } else {
                const res = await this.sequelizeModel.upsert(data);
                if (res) {
                    i.push({
                        cis_short_name: data.cis_short_name,
                        id: data.id,
                        start_cis_stop_id: data.start_cis_stop_id,
                        start_cis_stop_platform_code: data.start_cis_stop_platform_code,
                        start_timestamp: data.start_timestamp,
                    });
                } else {
                    u.push(data.id);
                }
                return { inserted: i, updated: u };
            }
        } catch (err) {
            throw new CustomError("Error while saving to database.", true, this.name, 1003, err);
        }
    }

    public getTripsWithoutGTFSTripId = async (): Promise<any> => {
        const connection = PostgresConnector.getConnection();

        const results = await connection.query(
            "SELECT id, cis_short_name, start_timestamp, start_cis_stop_id, start_cis_stop_platform_code "
            + "FROM " + VehiclePositions.trips.pgTableName + " "
            + "WHERE gtfs_trip_id IS NULL;",
            { type: Sequelize.QueryTypes.SELECT });

        log.debug(this.name + " Total trips without gtfs_trip_id: " + results.length);
        return results;
    }

    public findAndUpdateGTFSTripId = async (trip: any): Promise<any> => {
        const connection = PostgresConnector.getConnection();
        const startdate = moment(trip.start_timestamp);

        const result = await connection.query(
            "SELECT ropidgtfs_trips.trip_id as gtfs_trip_id, "
            + "    ropidgtfs_routes.route_id as gtfs_route_id, "
            + "    ropidgtfs_routes.route_short_name as gtfs_route_short_name "
            + "FROM ropidgtfs_trips "
            + "INNER JOIN ropidgtfs_routes ON ropidgtfs_trips.route_id=ropidgtfs_routes.route_id "
            + "INNER JOIN ropidgtfs_stop_times ON ropidgtfs_trips.trip_id=ropidgtfs_stop_times.trip_id "
            + "WHERE "
            + "( ropidgtfs_routes.route_short_name LIKE '" + trip.cis_short_name + "' "
            + "  OR CASE WHEN ('115' = 'IKEA') THEN ropidgtfs_routes.route_short_name LIKE 'IKEA ČM' ELSE 'FALSE' END "
            + ") "
            + "AND ropidgtfs_stop_times.stop_id IN "
            + "( SELECT stop_id FROM ropidgtfs_stops "
            + "WHERE stop_id LIKE "
            + "  (SELECT CONCAT('U',CAST(node AS TEXT),'Z%') FROM ropidgtfs_cis_stop_groups "
            + "  WHERE cis IN "
            + "    (SELECT cis FROM ropidgtfs_cis_stops WHERE cis = '" + trip.start_cis_stop_id + "')) "
            + "  AND "
            + "    (platform_code LIKE '" + trip.start_cis_stop_platform_code + "' "
            + "    OR CASE WHEN (LENGTH(platform_code)<2) THEN platform_code LIKE "
            + "      (CAST((ASCII('" + trip.start_cis_stop_platform_code + "')-64) AS CHAR)) END) "
            + ") "
            + "AND stop_sequence = 1 "
            + "AND ropidgtfs_stop_times.departure_time "
            + "  = TO_CHAR(('" + startdate.utc().format() + "' at time zone 'cet'), 'FMHH24:MI:SS') "
            + "AND ropidgtfs_trips.service_id IN ( "
            + "SELECT service_id FROM ropidgtfs_calendar "
            + "WHERE "
            + startdate.format("dddd").toLowerCase() + " = 1 "
            + "AND to_date(start_date, 'YYYYMMDD') <= '" + startdate.format("YYYY-MM-DD") + "' "
            + "AND to_date(end_date, 'YYYYMMDD') >= '" + startdate.format("YYYY-MM-DD") + "' "
            + "UNION SELECT service_id FROM ropidgtfs_calendar_dates "
            + "WHERE exception_type=1 "
            + "AND to_date(date, 'YYYYMMDD') = '" + startdate.format("YYYY-MM-DD") + "' "
            + "EXCEPT SELECT service_id FROM ropidgtfs_calendar_dates "
            + "WHERE exception_type=2 "
            + "AND to_date(date, 'YYYYMMDD') = '" + startdate.format("YYYY-MM-DD") + "' "
            + ");",
            { type: Sequelize.QueryTypes.SELECT });

        if (result[0]) {
            await this.sequelizeModel.update(result[0], { where: {
                id: trip.id,
            }});
        } else {
            throw new CustomError("Error while updating gtfs_trip_id for id '" + trip.id + "'.", true, this.name, 1022);
        }
    }

}
