"use strict";

import { VehiclePositions } from "data-platform-schema-definitions";
import * as Sequelize from "sequelize";
import Validator from "../helpers/Validator";
import { IModel } from "./IModel";
import PostgresModel from "./PostgresModel";

const { PostgresConnector } = require("../helpers/PostgresConnector");

export default class VehiclePositionsPositionsModel extends PostgresModel implements IModel {

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
        super(VehiclePositions.positions.name + "Model", {
                attributesToRemove: [ "id" ],
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
    }

    public getPositionsForUdpateDelay = async (tripId: string): Promise<any> => {
        const connection = PostgresConnector.getConnection();

        const results = await connection.query(
            "SELECT a.id, a.gtfs_trip_id, b.tracking, b.is_canceled, b.lat, b.lng, b.origin_time, "
            + "b.origin_timestamp, b.delay_stop_arrival, b.delay_stop_departure, b.delay, "
            + "b.gtfs_shape_dist_traveled, b.gtfs_next_stop_id, b.created "
            + "FROM " + VehiclePositions.trips.pgTableName + " a "
            + "RIGHT JOIN " + VehiclePositions.positions.pgTableName + " b ON a.id = b.trips_id "
            + "WHERE a.id = '" + tripId + "' AND b.tracking <> 0 AND a.gtfs_trip_id IS NOT NULL "
            + "ORDER BY b.created ASC;",
            { type: Sequelize.QueryTypes.SELECT });
        return results;
    }

    public updateDelay = async (tripsId, originTime, delay, gtfsShapeDistTraveled, gtfsNextStopId): Promise<any> => {
        const connection = PostgresConnector.getConnection();
        const t = await connection.transaction();
        try {
            await this.sequelizeModel.update({
                    delay,
                    gtfs_next_stop_id: gtfsNextStopId,
                    gtfs_shape_dist_traveled: gtfsShapeDistTraveled,
                },
                {
                    transaction: t,
                    where: {
                        origin_time: originTime,
                        tracking: { [Sequelize.Op.ne]: 0 },
                        trips_id: tripsId,
                    },
                },
            );
            return await t.commit();
        } catch (err) {
            return await t.rollback();
        }
    }

}
