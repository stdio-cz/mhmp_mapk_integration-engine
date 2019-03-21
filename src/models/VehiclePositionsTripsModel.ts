"use strict";

import { VehiclePositions } from "data-platform-schema-definitions";
import * as Sequelize from "sequelize";
import CustomError from "../helpers/errors/CustomError";
import log from "../helpers/Logger";
import Validator from "../helpers/Validator";
import { IModel } from "./IModel";
import PostgresModel from "./PostgresModel";

const { PostgresConnector } = require("../helpers/PostgresConnector");
const moment = require("moment");

export default class VehiclePositionsTripsModel extends PostgresModel implements IModel {

    /** Model name */
    public name: string;
    /** The Sequelize Model */
    protected sequelizeModel: Sequelize.Model<any, any>;
    /** The Sequelize Model for temporary table */
    protected tmpSequelizeModel: Sequelize.Model<any, any> | null;
    /** Validation helper */
    protected validator: Validator;
    /** Type/Strategy of saving the data */
    protected savingType: "insertOnly" | "insertOrUpdate";

    constructor() {
        super(VehiclePositions.trips.name + "Model", {
                outputSequelizeAttributes: VehiclePositions.trips.outputSequelizeAttributes,
                pgTableName: VehiclePositions.trips.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(VehiclePositions.trips.name + "ModelValidator",
                VehiclePositions.trips.outputMongooseSchemaObject),
        );
    }

    /**
     * Overrides PostgresModel::save
     */
    public save = async (data: any, useTmpTable: boolean = false): Promise<any> => {
        // data validation
        if (this.validator) {
            await this.validator.Validate(data);
        } else {
            log.warn(this.name + ": Model validator is not set.");
        }

        let model = this.sequelizeModel;
        if (useTmpTable) {
            model = this.tmpSequelizeModel;
            /// synchronizing only tmp model
            await model.sync();
        }

        try {
            const i = []; // inserted
            const u = []; // updated

            if (data instanceof Array) {
                const promises = data.map(async (d) => {
                    const res = await model.upsert(d);
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
                const res = await model.upsert(data);
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

    public findAndUpdateGTFSTripId = async (trip: any): Promise<any> => {
        const connection = PostgresConnector.getConnection();
        const startdate = moment(trip.start_timestamp);

        // TODO zbavit se raw query
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

        // TODO dat si bacha na posileny spoje
        // gtfs_trip_id obsahuje POS, rozlisit podle cis_order
        if (result[0]) {
            await this.sequelizeModel.update(result[0], { where: {
                id: trip.id,
            }});
        } else {
            throw new CustomError("Error while updating gtfs_trip_id for id '" + trip.id + "'.", true, this.name, 1022);
        }
    }

}
