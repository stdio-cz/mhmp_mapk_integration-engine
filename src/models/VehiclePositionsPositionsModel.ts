"use strict";

import { VehiclePositions } from "data-platform-schema-definitions";
import * as Sequelize from "sequelize";
import Validator from "../helpers/Validator";
import IModel from "./IModel";
import PostgresModel from "./PostgresModel";

const { PostgresConnector } = require("../helpers/PostgresConnector");

export default class VehiclePositionsPositionsModel extends PostgresModel implements IModel {

    public name: string;
    protected sequelizeModel: Sequelize.Model<any, any>;
    protected validator: Validator;

    constructor() {
        super();
        this.name = VehiclePositions.positions.name;

        this.sequelizeModel = PostgresConnector.getConnection().define(VehiclePositions.positions.pgTableName,
            VehiclePositions.positions.outputSequelizeAttributes);
        this.sequelizeModel.removeAttribute("id");
        this.validator = new Validator(this.name, VehiclePositions.positions.outputMongooseSchemaObject);
    }

    public getPositionsForUdpateDelay = async (tripId: string): Promise<any> => {
        const connection = PostgresConnector.getConnection();

        const results = await connection.query(
            "SELECT a.id, a.gtfs_trip_id, b.tracking, b.is_canceled, b.lat, b.lng, b.origin_time, "
            + "b.origin_timestamp, b.delay_stop_arrival, b.delay_stop_departure, b.delay, "
            + "b.gtfs_shape_dist_traveled, b.gtfs_next_stop_id, b.created "
            + "FROM " + VehiclePositions.trips.pgTableName + " a "
            + "RIGHT JOIN " + VehiclePositions.positions.pgTableName + " b ON a.id = b.trips_id "
            + "WHERE a.id = '" + tripId + "' AND b.tracking <> 0 "
            + "ORDER BY b.created ASC;",
            { type: Sequelize.QueryTypes.SELECT });
        return results;
    }

    public updateDelay = async (tripsId, originTime, delay, gtfsShapeDistTraveled, gtfsNextStopId): Promise<any> => {
        return await this.sequelizeModel.update({
                delay,
                gtfs_next_stop_id: gtfsNextStopId,
                gtfs_shape_dist_traveled: gtfsShapeDistTraveled,
            },
            { where: {
                origin_time: originTime,
                tracking: { [Sequelize.Op.ne]: 0 },
                trips_id: tripsId,
            }},
          );
    }

}
