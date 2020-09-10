"use strict";

import { VehiclePositions } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import * as Sequelize from "sequelize";
import { PostgresConnector } from "../../core/connectors";
import { IModel, PostgresModel } from "../../core/models";

export class VehiclePositionsPositionsModel extends PostgresModel implements IModel {

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
    /** Associated vehiclepositions_trips Model for updating the delay */
    protected tripsModel: Sequelize.Model<any, any>;

    constructor() {
        super(VehiclePositions.positions.name + "Model", {
            outputSequelizeAttributes: VehiclePositions.positions.outputSequelizeAttributes,
            pgTableName: VehiclePositions.positions.pgTableName,
            savingType: "insertOnly",
            sequelizeAdditionalSettings: {
                indexes: [{
                    fields: ["trips_id"],
                    name: "vehiclepositions_positions_trips_id",
                }, {
                    fields: ["origin_time"],
                    name: "vehiclepositions_positions_origin_time",
                }],
            },
        },
            new Validator(VehiclePositions.positions.name + "ModelValidator",
                VehiclePositions.positions.outputMongooseSchemaObject),
        );
        this.tripsModel = PostgresConnector.getConnection().define(VehiclePositions.trips.pgTableName,
            VehiclePositions.trips.outputSequelizeAttributes, {});
        this.tripsModel.hasMany(this.sequelizeModel, { foreignKey: "trips_id", sourceKey: "id" });
    }

    public getPositionsForUdpateDelay = async (tripId: string): Promise<any> => {
        const originTimeColumn = `"vehiclepositions_positions"."origin_time"`;
        const results = await this.tripsModel.findAll({
            attributes: [
                Sequelize.literal(`DISTINCT ON (${originTimeColumn}) ${originTimeColumn}`),
                "id", "gtfs_trip_id", "start_timestamp",
            ],
            include: [{
                attributes: ["lat", "lng", "origin_time", "origin_timestamp",
                    "delay", "tracking", "id", "shape_dist_traveled"],
                model: this.sequelizeModel,
                where: { },
            }],
            order: [
                [{ model: this.sequelizeModel }, "origin_time"],
                [{ model: this.sequelizeModel }, "created_at", "ASC"],
            ],
            raw: true,
            where: {
                gtfs_trip_id: { [Sequelize.Op.ne]: null },
                id: tripId,
            },
        });
        return results.map((r) => {
            return {
                delay: r["vehiclepositions_positions.delay"],
                gtfs_trip_id: r.gtfs_trip_id,
                id: r["vehiclepositions_positions.id"],
                lat: r["vehiclepositions_positions.lat"],
                lng: r["vehiclepositions_positions.lng"],
                origin_time: r["vehiclepositions_positions.origin_time"],
                origin_timestamp: r["vehiclepositions_positions.origin_timestamp"],
                shape_dist_traveled: r["vehiclepositions_positions.shape_dist_traveled"],
                start_timestamp: r.start_timestamp,
                tracking: r["vehiclepositions_positions.tracking"],
                trips_id: r.id,
            };
        });
    }

    public updateDelay = async (
            tripsId, originTime, delay, shapeDistTraveled,
            nextStopId, lastStopId,
            nextStopSequence, lastStopSequence,
            nextStopArrivalTime, lastStopArrivalTime,
            nextStopDepartureTime, lastStopDepartureTime,
            bearing,
        ): Promise<any> => {
        const connection = PostgresConnector.getConnection();
        const t = await connection.transaction();
        try {
            await this.sequelizeModel.update({
                bearing,
                delay,
                last_stop_arrival_time: lastStopArrivalTime,
                last_stop_departure_time: lastStopDepartureTime,
                last_stop_id: lastStopId,
                last_stop_sequence: lastStopSequence,
                next_stop_arrival_time: nextStopArrivalTime,
                next_stop_departure_time: nextStopDepartureTime,
                next_stop_id: nextStopId,
                next_stop_sequence: nextStopSequence,
                shape_dist_traveled: shapeDistTraveled,
            },
                {
                    transaction: t,
                    where: {
                        origin_time: originTime,
                        trips_id: tripsId,
                    },
                },
            );
            return await t.commit();
        } catch (err) {
            return await t.rollback();
        }
    }

    public bulkUpdate = async (
            data,
        ): Promise<any> => {

        const connection = PostgresConnector.getConnection();
        const primaryKeys = ["id"];
        const u = []; // updated

        try {
            // json stringify and escape quotes
            const stringifiedData = JSON.stringify(data).replace(/'/g, "\\'").replace(/\"/g, "\\\"");
            // TODO doplnit batch_id a author
            const rawRows = await connection.query(
                "SELECT meta.import_from_json("
                + "-1, " // p_batch_id bigint
                + "E'" + stringifiedData + "'::json, " // p_data json
                + "'" + "public" + "', " // p_table_schema character varying
                + "'" + "vehiclepositions_positions" + "', " // p_table_name character varying
                + "'" + JSON.stringify(primaryKeys) + "'::json, " // p_pk json
                + "NULL, " // p_sort json
                + "'integration-engine'" // p_worker_name character varying
                + ") ",
                {
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
                }
            });
            return { updated: u };
        } catch (err) {
            return false;
        }
    }

}
