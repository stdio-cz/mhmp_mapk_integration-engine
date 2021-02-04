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

    public getPositionsForUdpateDelay = async (tripIds: [string]): Promise<any> => {
        // TODO - check that origin_time is not duplicate for tracking == 2.
        // const originTimeColumn = `"vehiclepositions_positions"."origin_time"`;
        const results = await this.tripsModel.findAll({
            attributes: [
                // Sequelize.literal(`DISTINCT ON (${originTimeColumn}) ${originTimeColumn}`),
                "id", "gtfs_trip_id", "start_timestamp", "agency_name_scheduled",
            ],
            include: [{
                attributes: ["lat", "lng", "origin_time", "origin_timestamp",
                    "delay", "tracking", "id", "shape_dist_traveled"],
                model: this.sequelizeModel,
                where: {
                },
            }],
            order: [
                [{ model: this.sequelizeModel }, "origin_timestamp", "ASC"],
            ],
            raw: true,
            where: {
                gtfs_trip_id: { [Sequelize.Op.ne]: null },
                id: { [Sequelize.Op.any]: Array.isArray(tripIds) ? tripIds : [tripIds]},
            },
        });

        // Sequlize return with raw==true flatten array of results, nest==true is available for Sequelize ver >5 only
        // We return objects of positions grouped by trips_id
        return results.reduce((p, c, i) => {
            let pIndex = p.findIndex((e) => e.trips_id === c.id);
            if (pIndex === -1) {
                p.push({
                    agency_name_scheduled: c.agency_name_scheduled,
                    gtfs_trip_id: c.gtfs_trip_id,
                    positions: [],
                    start_timestamp: c.start_timestamp,
                    trips_id: c.id,
                });
                pIndex = p.findIndex((e) => e.trips_id === c.id);
            }
            p[pIndex].positions.push({
                delay: c["vehiclepositions_positions.delay"],
                id: c["vehiclepositions_positions.id"],
                lat: c["vehiclepositions_positions.lat"],
                lng: c["vehiclepositions_positions.lng"],
                origin_time: c["vehiclepositions_positions.origin_time"],
                origin_timestamp: c["vehiclepositions_positions.origin_timestamp"],
                shape_dist_traveled: c["vehiclepositions_positions.shape_dist_traveled"],
                tracking: c["vehiclepositions_positions.tracking"],
            });
            return p;
        }, []);
    }

    public bulkUpdate = async (data): Promise<any> => {

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
