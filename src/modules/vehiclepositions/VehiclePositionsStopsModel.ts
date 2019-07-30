"use strict";

import { CustomError } from "golemio-errors";
import { VehiclePositions } from "golemio-schema-definitions";
import { Validator } from "golemio-validator";
import * as Sequelize from "sequelize";
import { PostgresConnector } from "../../core/connectors";
import { log } from "../../core/helpers";
import { IModel, PostgresModel } from "../../core/models";

export class VehiclePositionsStopsModel extends PostgresModel implements IModel {

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
        super(VehiclePositions.stops.name + "Model", {
            outputSequelizeAttributes: VehiclePositions.stops.outputSequelizeAttributes,
            pgTableName: VehiclePositions.stops.pgTableName,
            savingType: "insertOrUpdate",
        },
            new Validator(VehiclePositions.stops.name + "ModelValidator",
                VehiclePositions.stops.outputMongooseSchemaObject),
        );
    }

    /**
     * Overrides PostgresModel::save
     */
    public save = async (data: any, useTmpTable: boolean = false): Promise<any> => {
        // data validation
        if (this.validator) {
            await this.validator.Validate(data);
        } else {
            log.warn(this.name + ": Model validator is not set.");
        }

        if (useTmpTable) {
            throw new CustomError("Saving to tmp table is not implemented for this model.", true, this.name);
        }

        try {
            const connection = PostgresConnector.getConnection();
            // TODO doplnit batch_id a author
            await connection.query(
                "SELECT public.import_vehiclepositions_stops(-1, '"
                + JSON.stringify(data)
                + "'::json, 'integration-engine') ",
                { type: Sequelize.QueryTypes.SELECT },
            );
        } catch (err) {
            throw new CustomError("Error while saving to database.", true, this.name, 1003, err);
        }
    }

}
