"use strict";

import { CustomError } from "@golemio/errors";
import { VehiclePositions } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import * as Sequelize from "sequelize";
import { PostgresConnector } from "../../core/connectors";
import { log } from "../../core/helpers";
import { IModel, PostgresModel } from "../../core/models";

import * as moment from "moment-timezone";

export class VehiclePositionsTripsModel extends PostgresModel implements IModel {

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

    public associate = (lastPositionsModel: Sequelize.Model<any, any>): any => {
        this.sequelizeModel.hasOne(lastPositionsModel, {
            as: "last_position",
            foreignKey: "trips_id",
        });
    }

    /**
     * Overrides PostgresModel::save
     */
    public save = async (data: any, useTmpTable: boolean = false): Promise<any> => {
        // data validation
        if (this.validator) {
            try {
                await this.validator.Validate(data);
            } catch (err) {
                throw new CustomError("Error while validating data.", true, this.name, 4005, err);
            }
        } else {
            log.warn(this.name + ": Model validator is not set.");
        }

        if (useTmpTable) {
            throw new CustomError("Saving to tmp table is not implemented for this model.", true, this.name);
        }

        const connection = PostgresConnector.getConnection();
        const t = await connection.transaction();

        try {
            const i = []; // inserted
            const u = []; // updated

            if (data instanceof Array) {
                const promises = data.map(async (d) => {
                    const res = await this.sequelizeModel.upsert(d, { transaction: t });
                    if (res) {
                        i.push({
                            cis_line_short_name: d.cis_line_short_name,
                            id: d.id,
                            start_asw_stop_id: d.start_asw_stop_id,
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
                await t.commit();
                return { inserted: i, updated: u };
            } else {
                const res = await this.sequelizeModel.upsert(data, { transaction: t });
                if (res) {
                    i.push({
                        cis_line_short_name: data.cis_line_short_name,
                        id: data.id,
                        start_asw_stop_id: data.start_asw_stop_id,
                        start_cis_stop_id: data.start_cis_stop_id,
                        start_cis_stop_platform_code: data.start_cis_stop_platform_code,
                        start_timestamp: data.start_timestamp,
                    });
                } else {
                    u.push(data.id);
                }
                await t.commit();
                return { inserted: i, updated: u };
            }
        } catch (err) {
            log.error(JSON.stringify({ errors: err.errors, fields: err.fields }));
            await t.rollback();
            throw new CustomError("Error while saving to database.", true, this.name, 4001, err);
        }
    }

    /**
     * Overrides PostgresModel::saveBySqlFunction
     */
    public saveBySqlFunction = async (
        data: any,
        primaryKeys: string[],
        useTmpTable: boolean = false,
        transaction: Sequelize.Transaction = null,
        connection: Sequelize.Sequelize = null,
    ): Promise<any> => {
        // data validation
        if (this.validator) {
            try {
                await this.validator.Validate(data);
            } catch (err) {
                throw new CustomError("Error while validating data.", true, this.name, 4005, err);
            }
        } else {
            log.warn(this.name + ": Model validator is not set.");
        }

        const i = []; // inserted
        const u = []; // updated

        try {
            connection = connection || PostgresConnector.getConnection();
            // json stringify and escape quotes
            const stringifiedData = JSON.stringify(data).replace(/'/g, "\\'").replace(/\"/g, "\\\"");
            // TODO doplnit batch_id a author
            const rawRows = await connection.query(
                "SELECT meta.import_from_json("
                + "-1, " // p_batch_id bigint
                + "E'" + stringifiedData + "'::json, " // p_data json
                + "'" + ((useTmpTable) ? "tmp" : "public") + "', " // p_table_schema character varying
                + "'" + this.tableName + "', " // p_table_name character varying
                + "'" + JSON.stringify(primaryKeys) + "'::json, " // p_pk json
                + "NULL, " // p_sort json
                + "'integration-engine'" // p_worker_name character varying
                + ") ",
                {
                    transaction,
                    type: Sequelize.QueryTypes.SELECT,
                },
            );
            JSON.parse(rawRows[0].import_from_json
                .replace('("', "")
                .replace('",)', "")
                .replace(/""/g, '"'),
            ).forEach((r: { id: string, upd: boolean }) => {
                if (r.upd === true) {
                    u.push(r.id);
                } else {
                    const d = data.find((di) => di.id === r.id);
                    i.push({
                        cis_line_short_name: d.cis_line_short_name,
                        id: r.id,
                        start_asw_stop_id: d.start_asw_stop_id,
                        start_cis_stop_id: d.start_cis_stop_id,
                        start_cis_stop_platform_code: d.start_cis_stop_platform_code,
                        start_timestamp: d.start_timestamp,
                    });
                }
            });
            return { inserted: i, updated: u };
        } catch (err) {
            throw new CustomError("Error while saving to database.", true, this.name, 4001, err);
        }
    }

    public findGTFSTripId = async (trip: any): Promise<any> => {
        const connection = PostgresConnector.getConnection();
        const startDate = moment(trip.start_timestamp).tz("Europe/Prague");
        const startDateDayBefore = moment(trip.start_timestamp).tz("Europe/Prague").subtract(1, "day");

        const startDateYMD = startDate.format("YYYY-MM-DD");
        const startDateDayName = startDate.format("dddd").toLowerCase();
        const startDateDayBeforeYMD = startDateDayBefore.format("YYYY-MM-DD");
        const startDateDayBeforeDayName = startDateDayBefore.format("dddd").toLowerCase();

        // TODO zbavit se raw query
        // TODO zbavit se sql injection
        // TODO dat si bacha na posileny spoje
        // gtfs_trip_id obsahuje POS, rozlisit podle cis_order
        const result = await connection.query(`
            SELECT ropidgtfs_trips.trip_id as gtfs_trip_id,
                ropidgtfs_trips.trip_headsign as gtfs_trip_headsign,
                ropidgtfs_routes.route_id as gtfs_route_id,
                ropidgtfs_routes.route_short_name as gtfs_route_short_name
            FROM ropidgtfs_trips
            INNER JOIN ropidgtfs_routes ON ropidgtfs_trips.route_id=ropidgtfs_routes.route_id
            INNER JOIN ropidgtfs_stop_times ON ropidgtfs_trips.trip_id=ropidgtfs_stop_times.trip_id
            WHERE
            ( ropidgtfs_routes.route_short_name LIKE '${trip.cis_line_short_name}'
              OR CASE WHEN (ropidgtfs_routes.route_short_name = 'IKEA')
                THEN ropidgtfs_routes.route_short_name LIKE 'IKEA ČM'
                ELSE 'FALSE' END
            )
            AND ropidgtfs_stop_times.stop_id IN
            ( SELECT stop_id FROM ropidgtfs_stops
            WHERE stop_id LIKE
              (SELECT CONCAT('U',CAST(node AS TEXT),'Z%') FROM ropidgtfs_cis_stop_groups
              WHERE cis IN
                (SELECT cis FROM ropidgtfs_cis_stops
                    WHERE cis = '${trip.start_cis_stop_id || 0}' OR id = '${trip.start_asw_stop_id || ""}'))
              AND
                (platform_code LIKE '${trip.start_cis_stop_platform_code}'
                OR CASE WHEN (LENGTH(platform_code)<2) THEN platform_code LIKE
                  (CAST((ASCII('${trip.start_cis_stop_platform_code}')-64) AS CHAR)) END)
            )
            AND stop_sequence = 1
            AND CONCAT(
                MOD(SUBSTRING(LPAD(ropidgtfs_stop_times.departure_time, 8, '0'),1,2)::int,24),
                SUBSTRING(LPAD(ropidgtfs_stop_times.departure_time, 8, '0'),3,6)
              )
                =  TO_CHAR(('${startDate.utc().format()}' at time zone 'Europe/Prague'), 'FMHH24:MI:SS')
            AND ( CASE WHEN SUBSTRING(LPAD(ropidgtfs_stop_times.departure_time, 8, '0'),1,2)::int >= 24 THEN
                    ropidgtfs_trips.service_id IN (
                    SELECT service_id FROM ropidgtfs_calendar
                    WHERE ${startDateDayName} = 1
                    AND to_date(start_date, 'YYYYMMDD') <= '${startDateYMD}'
                    AND to_date(end_date, 'YYYYMMDD') >= '${startDateYMD}'
                    UNION SELECT service_id FROM ropidgtfs_calendar_dates
                    WHERE exception_type = 1
                    AND to_date(date, 'YYYYMMDD') = '${startDateYMD}'
                    EXCEPT SELECT service_id FROM ropidgtfs_calendar_dates
                    WHERE exception_type = 2
                    AND to_date(date, 'YYYYMMDD') = '${startDateYMD}'
                    )
                ELSE
                    ropidgtfs_trips.service_id IN (
                    SELECT service_id FROM ropidgtfs_calendar
                    WHERE ${startDateDayBeforeDayName} = 1
                    AND to_date(start_date, 'YYYYMMDD') <= '${startDateDayBeforeYMD}'
                    AND to_date(end_date, 'YYYYMMDD') >= '${startDateDayBeforeYMD}'
                    UNION SELECT service_id FROM ropidgtfs_calendar_dates
                    WHERE exception_type = 1
                    AND to_date(date, 'YYYYMMDD') = '${startDateDayBeforeYMD}'
                    EXCEPT SELECT service_id FROM ropidgtfs_calendar_dates
                    WHERE exception_type = 2
                    AND to_date(date, 'YYYYMMDD') = '${startDateDayBeforeYMD}'
                    )
                END
            )
            ;`,
            { type: Sequelize.QueryTypes.SELECT });

        if (!result[0]) {
            throw new CustomError(`Model data was not found for id '${trip.id}'.`, true,
                this.constructor.name, 4003);
        }
        return result[0];
    }

    public hasOne = (model: any, options: any): any => {
        return this.sequelizeModel.hasOne(model, options);
    }

    public findAll = async (options: any): Promise<any> => {
        return this.sequelizeModel.findAll(options);
    }

}
