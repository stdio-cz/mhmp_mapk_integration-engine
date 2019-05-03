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

    // helper view models
    private tripsStopTimesViewModel: Sequelize.Model<any, any>;
    private tripsShapesViewModel: Sequelize.Model<any, any>;

    constructor() {
        super(RopidGTFS.trips.name + "Model", {
                outputSequelizeAttributes: RopidGTFS.trips.outputSequelizeAttributes,
                pgTableName: RopidGTFS.trips.pgTableName,
                savingType: "insertOnly",
            },
            new Validator(RopidGTFS.trips.name + "ModelValidator",
                RopidGTFS.trips.outputMongooseSchemaObject),
        );

        this.tripsStopTimesViewModel = PostgresConnector.getConnection().define(
            RopidGTFS.tripsStopTimesView.pgTableName,
            RopidGTFS.tripsStopTimesView.outputSequelizeAttributes,
            { timestamps: false },
        );
        this.tripsStopTimesViewModel.removeAttribute("id");

        this.tripsShapesViewModel = PostgresConnector.getConnection().define(
            RopidGTFS.tripsShapesView.pgTableName,
            RopidGTFS.tripsShapesView.outputSequelizeAttributes,
            { timestamps: false },
        );
        this.tripsShapesViewModel.removeAttribute("id");
    }

    public findByIdWithStopTimes = async (tripId: string): Promise<any> => {
        const result = await this.tripsStopTimesViewModel.findAll({
            where: { trip_id: tripId },
        });

        // result transformation to object { <tripData>, stop_times: [ <stopTimesDataWithStop> ] }
        let tranformedResult = {
            stop_times: [],
        };
        result.forEach((row) => {
            const stop = {
                stop_id: row.stop_times_stop_stop_id,
                stop_lat: row.stop_times_stop_stop_lat,
                stop_lon: row.stop_times_stop_stop_lon,
            };
            const stopTime = {
                arrival_time: row.stop_times_arrival_time,
                arrival_time_seconds: row.stop_times_arrival_time_seconds,
                departure_time: row.stop_times_departure_time,
                departure_time_seconds: row.stop_times_departure_time_seconds,
                shape_dist_traveled: row.stop_times_shape_dist_traveled,
                stop_id: row.stop_times_stop_id,
                stop_sequence: row.stop_times_stop_sequence,
                trip_id: row.stop_times_trip_id,

                stop,
            };
            tranformedResult.stop_times.push(stopTime);
            tranformedResult = { ...tranformedResult, ...{
                bikes_allowed: row.bikes_allowed,
                block_id: row.block_id,
                direction_id: row.direction_id,
                exceptional: row.exceptional,
                route_id: row.route_id,
                service_id: row.service_id,
                shape_id: row.shape_id,
                trip_headsign: row.trip_headsign,
                trip_id: row.trip_id,
                wheelchair_accessible: row.wheelchair_accessible,
            }};
        });
        return tranformedResult;
    }

    public findByIdWithShapes = async (tripId: string): Promise<any> => {
        const result = await this.tripsShapesViewModel.findAll({
            where: { trip_id: tripId },
        });

        // result transformation to object { <tripData>, shapes: [ <shapesData> ] }
        let tranformedResult = {
            shapes: [],
        };
        result.forEach((row) => {
            const shape = {
                shape_dist_traveled: row.shapes_shape_dist_traveled,
                shape_id: row.shapes_shape_id,
                shape_pt_lat: row.shapes_shape_pt_lat,
                shape_pt_lon: row.shapes_shape_pt_lon,
                shape_pt_sequence: row.shapes_shape_pt_sequence,
            };
            tranformedResult.shapes.push(shape);
            tranformedResult = { ...tranformedResult, ...{
                bikes_allowed: row.bikes_allowed,
                block_id: row.block_id,
                direction_id: row.direction_id,
                exceptional: row.exceptional,
                route_id: row.route_id,
                service_id: row.service_id,
                shape_id: row.shape_id,
                trip_headsign: row.trip_headsign,
                trip_id: row.trip_id,
                wheelchair_accessible: row.wheelchair_accessible,
            }};
        });
        return tranformedResult;
    }

}
