"use strict";

import { CustomError } from "@golemio/errors";
import { VehiclePositions } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import * as Sequelize from "sequelize";
import { PostgresConnector } from "../../core/connectors";
import { log } from "../../core/helpers";
import { IModel, PostgresModel } from "../../core/models";

import * as moment from "moment-timezone";

export interface IUpdateGTFSTripIdData {
    cis_line_short_name: string;
    id: string;
    start_asw_stop_id: string | null;
    start_cis_stop_id: number | null;
    start_cis_stop_platform_code?: string | null;
    start_timestamp: number;
    agency_name_real: string | null;
    agency_name_scheduled: string | null;
    cis_line_id: string | null;
    cis_trip_number: number | null;
    origin_route_name: string | null;
    sequence_id: string | null;
    start_time: string | null;
    vehicle_registration_number: string | null;
    vehicle_type_id: number | null;
    wheelchair_accessible: boolean | null;

}

export interface IFoundGTFSTripData {
    id?: string;
    gtfs_trip_id: string;
    gtfs_trip_headsign: string;
    gtfs_route_id: string;
    gtfs_route_short_name: string;

    gtfs_block_id?: string;
    gtfs_trip_short_name?: string;
    gtfs_route_type?: number;
    cis_trip_number?: number;
}

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
    ): Promise<{ inserted: IUpdateGTFSTripIdData[], updated: string[] }> => {
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

        const i: IUpdateGTFSTripIdData[] = []; // inserted
        const u: string[] = []; // updated

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

                        agency_name_real: d.agency_name_real,
                        agency_name_scheduled: d.agency_name_scheduled,
                        cis_line_id: d.cis_line_id,
                        cis_trip_number: d.cis_trip_number,
                        origin_route_name: d.origin_route_name,
                        sequence_id: d.sequence_id,
                        start_time: d.start_time,
                        vehicle_registration_number: d.vehicle_registration_number,
                        vehicle_type_id: d.vehicle_type_id,
                        wheelchair_accessible: d.wheelchair_accessible,
                    });
                }
            });
            return { inserted: i, updated: u };
        } catch (err) {
            throw new CustomError("Error while saving to database.", true, this.name, 4001, err);
        }
    }

    public findAllAsocTripIds = async (tripIds: string[]): Promise<string[]> => {
        const connection = PostgresConnector.getConnection();
        return (Array.isArray(tripIds) && tripIds.length > 0) ? (await connection.query(
            `select id from ${this.tableName} where
            id like any (array[${tripIds.map(
                (id: string) => {
                    return `'${id}%'`;
                },
            ).join(",")}])`,
            { type: Sequelize.QueryTypes.SELECT },
        )).map((res: any) => res.id) : [];
    }

    public findGTFSTripId = async (trip: IUpdateGTFSTripIdData): Promise<string | string[]> => {
        if (trip.start_cis_stop_id >= 5400000 && trip.start_cis_stop_id < 5500000) {
            // trains
            let foundGtfsTrips = await this.findGTFSTripIdsTrain(trip);

            if (foundGtfsTrips && foundGtfsTrips.length) {
                const newIds: string[] = [trip.id];
                foundGtfsTrips = foundGtfsTrips.sort((a, b) => a.gtfs_trip_id > b.gtfs_trip_id ? -1 : 1);

                await this.update(foundGtfsTrips.pop(), {
                    where: {
                        id: trip.id,
                    },
                });

                for (const foundTrip of foundGtfsTrips) {
                    const newId = `${trip.id}_gtfs_trip_id_${foundTrip.gtfs_trip_id}`;

                    foundTrip.id = newId;
                    newIds.push(newId);

                    await this.save({...trip, ...foundTrip});

                    // await this.query(`DELETE from ${this.tableName}
                    //  where id = '${orgId}'`);
                }
                return newIds;
            }

        } else if (0) {
            // DPP
            // TODO
        } else {
            // other
            const foundGtfsTrip = await this.findGTFSTripIdBasic(trip);

            await this.update(foundGtfsTrip, {
                where: {
                    id: trip.id,
                },
            });
            return [trip.id];
        }
    }

    public hasOne = (model: any, options: any): any => {
        return this.sequelizeModel.hasOne(model, options);
    }

    public findAll = async (options: any): Promise<any> => {
        return this.sequelizeModel.findAll(options);
    }

    private findGTFSTripIdBasic = async (trip: IUpdateGTFSTripIdData): Promise<IFoundGTFSTripData> => {
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
                ropidgtfs_routes.route_type as gtfs_route_type,
                ropidgtfs_routes.route_short_name as gtfs_route_short_name
            FROM ropidgtfs_trips
            INNER JOIN ropidgtfs_routes ON ropidgtfs_trips.route_id=ropidgtfs_routes.route_id
            INNER JOIN ropidgtfs_stop_times ON ropidgtfs_trips.trip_id=ropidgtfs_stop_times.trip_id
            WHERE
            ( ropidgtfs_routes.route_short_name LIKE '${trip.cis_line_short_name}'
              OR CASE WHEN ('${trip.cis_line_short_name}' = 'IKEA')
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
            AND ( CASE WHEN SUBSTRING(LPAD(ropidgtfs_stop_times.departure_time, 8, '0'),1,2)::int < 24 THEN
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
            { type: Sequelize.QueryTypes.SELECT },
        );

        if (!result[0]) {
            throw new CustomError(`Model data was not found for id '${trip.id}' (basic).`, true,
                this.constructor.name, 4003);
        }
        return result[0];
    }

    private findGTFSTripIdsTrain = async (trip: IUpdateGTFSTripIdData): Promise<IFoundGTFSTripData[]> => {
        const connection = PostgresConnector.getConnection();

        const result = await connection.query(`
            WITH wanted_trip AS (SELECT cis_line_short_name,
                cis_trip_number,
                start_cis_stop_id,
                start_asw_stop_id,
                start_timestamp,
                TO_TIMESTAMP(start_timestamp/1000) as start_datetime,
                DATE_TRUNC('day', TO_TIMESTAMP(start_timestamp/1000)) AS start_date,
                DATE_TRUNC('day', TO_TIMESTAMP(start_timestamp/1000)) AS start_date_name,
                DATE_TRUNC('day', TO_TIMESTAMP(start_timestamp/1000)) - INTERVAL '1 day' AS start_date_day_before,
                TO_CHAR((TO_TIMESTAMP(start_timestamp/1000) at time zone 'Europe/Prague'), 'FMHH24:MI:SS'),
                to_char(DATE_TRUNC('day', TO_TIMESTAMP(start_timestamp/1000)), 'day') as test
            FROM vehiclepositions_trips
            WHERE id = '${trip.id}'
            LIMIT 1)
            SELECT ropidgtfs_trips.trip_id as gtfs_trip_id,
                ropidgtfs_trips.block_id as gtfs_block_id,
                ropidgtfs_trips.trip_headsign as gtfs_trip_headsign,
                ropidgtfs_trips.trip_short_name as gtfs_trip_short_name,
                ropidgtfs_routes.route_id as gtfs_route_id,
                ropidgtfs_routes.route_type as gtfs_route_type,
                ropidgtfs_routes.route_short_name as gtfs_route_short_name,
                wanted_trip.cis_trip_number
            FROM ropidgtfs_trips
            INNER JOIN wanted_trip ON 1 = 1
            INNER JOIN ropidgtfs_routes ON ropidgtfs_trips.route_id=ropidgtfs_routes.route_id
            INNER JOIN ropidgtfs_stop_times ON ropidgtfs_trips.trip_id=ropidgtfs_stop_times.trip_id
            WHERE
                ropidgtfs_trips.trip_id LIKE CONCAT('%_', wanted_trip.cis_trip_number, '_%')
                AND ropidgtfs_routes.route_type = '2'
                AND stop_sequence = 1
                AND ( CASE WHEN SUBSTRING(LPAD(ropidgtfs_stop_times.departure_time, 8, '0'),1,2)::int < 24 THEN
                        ropidgtfs_trips.service_id IN (
                        SELECT service_id FROM ropidgtfs_calendar
                        WHERE (
                        CASE WHEN extract(isodow from wanted_trip.start_date) = 1 THEN monday = '1'
                            WHEN extract(isodow from wanted_trip.start_date) = 2 THEN tuesday = '1'
                            WHEN extract(isodow from wanted_trip.start_date) = 3 THEN wednesday = '1'
                            WHEN extract(isodow from wanted_trip.start_date) = 4 THEN thursday = '1'
                            WHEN extract(isodow from wanted_trip.start_date) = 5 THEN friday = '1'
                            WHEN extract(isodow from wanted_trip.start_date) = 6 THEN saturday = '1'
                            WHEN extract(isodow from wanted_trip.start_date) = 7 THEN sunday = '1'
                            ELSE 'FALSE'
                        END
                        )
                        AND to_date(start_date, 'YYYYMMDD') <= wanted_trip.start_date
                        AND to_date(end_date, 'YYYYMMDD') >= wanted_trip.start_date
                        UNION SELECT service_id FROM ropidgtfs_calendar_dates
                        WHERE exception_type = 1
                        AND to_date(date, 'YYYYMMDD') = wanted_trip.start_date
                        EXCEPT SELECT service_id FROM ropidgtfs_calendar_dates
                        WHERE exception_type = 2
                        AND to_date(date, 'YYYYMMDD') = wanted_trip.start_date
                        )
                    ELSE
                        ropidgtfs_trips.service_id IN (
                        SELECT service_id FROM ropidgtfs_calendar
                        WHERE (
                        CASE WHEN extract(isodow from wanted_trip.start_date_day_before) = 1 THEN monday = '1'
                            WHEN extract(isodow from wanted_trip.start_date_day_before) = 2 THEN tuesday = '1'
                            WHEN extract(isodow from wanted_trip.start_date_day_before) = 3 THEN wednesday = '1'
                            WHEN extract(isodow from wanted_trip.start_date_day_before) = 4 THEN thursday = '1'
                            WHEN extract(isodow from wanted_trip.start_date_day_before) = 5 THEN friday = '1'
                            WHEN extract(isodow from wanted_trip.start_date_day_before) = 6 THEN saturday = '1'
                            WHEN extract(isodow from wanted_trip.start_date_day_before) = 7 THEN sunday = '1'
                            ELSE 'FALSE'
                        END
                        )
                        AND to_date(start_date, 'YYYYMMDD') <= wanted_trip.start_date_day_before
                        AND to_date(end_date, 'YYYYMMDD') >= wanted_trip.start_date_day_before
                        UNION SELECT service_id FROM ropidgtfs_calendar_dates
                        WHERE exception_type = 1
                        AND to_date(date, 'YYYYMMDD') = wanted_trip.start_date_day_before
                        EXCEPT SELECT service_id FROM ropidgtfs_calendar_dates
                        WHERE exception_type = 2
                        AND to_date(date, 'YYYYMMDD') = wanted_trip.start_date_day_before
                        )
                    END
                )
            ;`,
            { type: Sequelize.QueryTypes.SELECT },
        );

        if (!result[0]) {
            throw new CustomError(`Model data was not found for id '${trip.id}' (train).`, true,
                this.constructor.name, 4003);
        }

        // TODO more than one found gtfs trip id example
        // 2021-01-08T11:42:00Z_none_U4_6914
        // return [
        //     {
        //         gtfs_trip_id: '1304_6914_201214',
        //         gtfs_block_id: '1304_6914_201214',
        //         gtfs_trip_headsign: 'Ústí n.L. hl.n.',
        //         gtfs_trip_short_name: 'Os 6914',
        //         gtfs_route_id: 'L1304',
        //         gtfs_route_short_name: 'S4',
        //         cis_trip_number: 6914
        //     },
        //     {
        //         gtfs_trip_id: '1004_6914_201214',
        //         gtfs_block_id: '1304_6914_201214',
        //         gtfs_trip_headsign: 'Ústí n.L. hl.n.',
        //         gtfs_trip_short_name: 'Os 6914',
        //         gtfs_route_id: 'L1004',
        //         gtfs_route_short_name: 'U4',
        //         cis_trip_number: 6914
        //     }
        // ]

        return result;
    }

    private findGTFSTripIdDPP = async (trip: IUpdateGTFSTripIdData): Promise<any> => {
        // TODO
    }

}
