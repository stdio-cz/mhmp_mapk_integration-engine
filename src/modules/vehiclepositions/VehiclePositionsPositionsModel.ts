"use strict";

import { VehiclePositions } from "data-platform-schema-definitions";
import * as Sequelize from "sequelize";
import { PostgresConnector, Validator } from "../../core/helpers";
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
        this.tripsModel = PostgresConnector.getConnection().define(VehiclePositions.trips.pgTableName,
            VehiclePositions.trips.outputSequelizeAttributes, {});
        this.tripsModel.hasMany(this.sequelizeModel, {foreignKey: "trips_id", sourceKey: "id"});
    }

    public getPositionsForUdpateDelay = async (tripId: string): Promise<any> => {
        const results = await this.tripsModel.findAll({
            attributes: [ "id", "gtfs_trip_id" ],
            include: [{
                attributes: [ "lat", "lng", "origin_time", "origin_timestamp", "delay" ],
                model: this.sequelizeModel,
                where: { tracking: { [Sequelize.Op.ne]: 0 } },
            }],
            order: [[{ model: this.sequelizeModel }, "created_at", "ASC"]],
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
                id: r.id,
                lat: r["vehiclepositions_positions.lat"],
                lng: r["vehiclepositions_positions.lng"],
                origin_time: r["vehiclepositions_positions.origin_time"],
                origin_timestamp: r["vehiclepositions_positions.origin_timestamp"],
            };
        });
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
