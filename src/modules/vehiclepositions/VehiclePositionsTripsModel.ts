"use strict";

import { CustomError } from "@golemio/errors";
import { VehiclePositions } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import * as Sequelize from "sequelize";
import { PostgresConnector } from "../../core/connectors";
import { log } from "../../core/helpers";
import { IModel, PostgresModel } from "../../core/models";

import * as moment from "moment";

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
            // TODO use postgres function meta.import_from_json

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

    public findGTFSTripId = async (trip: any): Promise<any> => {
        const connection = PostgresConnector.getConnection();
        const startdate = moment(trip.start_timestamp);

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
              OR CASE WHEN ('115' = 'IKEA') THEN ropidgtfs_routes.route_short_name LIKE 'IKEA ČM' ELSE 'FALSE' END
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
            AND ropidgtfs_stop_times.departure_time
              = TO_CHAR(('${startdate.utc().format()}' at time zone 'Europe/Prague'), 'FMHH24:MI:SS')
            AND ropidgtfs_trips.service_id IN (
            SELECT service_id FROM ropidgtfs_calendar
            WHERE ${startdate.format("dddd").toLowerCase()} = 1
            AND to_date(start_date, 'YYYYMMDD') <= '${startdate.format("YYYY-MM-DD")}'
            AND to_date(end_date, 'YYYYMMDD') >= '${startdate.format("YYYY-MM-DD")}'
            UNION SELECT service_id FROM ropidgtfs_calendar_dates
            WHERE exception_type = 1
            AND to_date(date, 'YYYYMMDD') = '${startdate.format("YYYY-MM-DD")}'
            EXCEPT SELECT service_id FROM ropidgtfs_calendar_dates
            WHERE exception_type = 2
            AND to_date(date, 'YYYYMMDD') = '${startdate.format("YYYY-MM-DD")}'
            );`,
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
