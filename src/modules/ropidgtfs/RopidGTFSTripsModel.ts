"use strict";

import { RopidGTFS } from "golemio-schema-definitions";
import * as Sequelize from "sequelize";
import { PostgresConnector } from "../../core/connectors";
import { Validator } from "../../core/helpers";
import { IModel, PostgresModel } from "../../core/models";

export class RopidGTFSTripsModel extends PostgresModel implements IModel {

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
        super(RopidGTFS.trips.name + "Model", {
                hasTmpTable: true,
                outputSequelizeAttributes: RopidGTFS.trips.outputSequelizeAttributes,
                pgTableName: RopidGTFS.trips.pgTableName,
                savingType: "insertOnly",
            },
            new Validator(RopidGTFS.trips.name + "ModelValidator",
                RopidGTFS.trips.outputMongooseSchemaObject),
        );

        const stopTimesModel = PostgresConnector.getConnection().define(RopidGTFS.stop_times.pgTableName,
            RopidGTFS.stop_times.outputSequelizeAttributes, {});
        const stopsModel = PostgresConnector.getConnection().define(RopidGTFS.stops.pgTableName,
            RopidGTFS.stops.outputSequelizeAttributes, {});
        stopTimesModel.belongsTo(stopsModel, {
            as: "stop",
            foreignKey: "stop_id",
            targetKey: "stop_id",
        });
        this.sequelizeModel.hasMany(stopTimesModel, {
            as: "stop_times",
            foreignKey: "trip_id",
            onDelete: "NO ACTION",
            onUpdate: "NO ACTION",
        });

        const shapesModel = PostgresConnector.getConnection().define(RopidGTFS.shapes.pgTableName,
            RopidGTFS.shapes.outputSequelizeAttributes, {});
        this.sequelizeModel.hasMany(shapesModel, {
            as: "shapes",
            foreignKey: "shape_id",
            sourceKey: "shape_id",
        });
    }

    public findByIdWithStopTimes = async (tripId: string): Promise<any> => {
        const sequelizeConnection = PostgresConnector.getConnection();
        const result = await this.sequelizeModel.findByPk(tripId, {
            attributes: {
                exclude: [
                    "create_batch_id", "created_at", "created_by", "update_batch_id", "updated_at", "updated_by",
                ],
            },
            include: [
                {
                    as: "stop_times",
                    attributes: { exclude: [
                        "create_batch_id", "created_at", "created_by", "update_batch_id", "updated_at", "updated_by",
                        "stop_headsign", "pickup_type", "drop_off_type",
                    ]},
                    include: [{
                        as: "stop",
                        attributes: [ "stop_id", "stop_lat", "stop_lon" ],
                        model: sequelizeConnection.models[RopidGTFS.stops.pgTableName],
                    }],
                    model: sequelizeConnection.models[RopidGTFS.stop_times.pgTableName],
                },
            ],
            order: [[
                { as: "stop_times", model: sequelizeConnection.models[RopidGTFS.stop_times.pgTableName] },
                "stop_sequence",
            ]],
        });
        return result;
    }

    public findByIdWithShapes = async (tripId: string): Promise<any> => {
        const sequelizeConnection = PostgresConnector.getConnection();
        const result = await this.sequelizeModel.findByPk(tripId, {
            attributes: {
                exclude: [
                    "create_batch_id", "created_at", "created_by", "update_batch_id", "updated_at", "updated_by",
                ],
            },
            include: [
                {
                    as: "shapes",
                    attributes: { exclude: [
                        "create_batch_id", "created_at", "created_by", "update_batch_id", "updated_at", "updated_by",
                    ]},
                    model: sequelizeConnection.models[RopidGTFS.shapes.pgTableName],
                },
            ],
            order: [[
                { as: "shapes", model: sequelizeConnection.models[RopidGTFS.shapes.pgTableName] },
                "shape_pt_sequence",
            ]],
        });
        return result;
    }

}
