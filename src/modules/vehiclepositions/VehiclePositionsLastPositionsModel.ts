"use strict";

import { VehiclePositions } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import * as Sequelize from "sequelize";
import { IModel, PostgresModel } from "../../core/models";

export class VehiclePositionsLastPositionsModel extends PostgresModel implements IModel {

    /** Model name */
    public name: string;
    /** The Sequelize Model */
    public sequelizeModel: Sequelize.Model<any, any>;
    /** The Sequelize Model for temporary table */
    protected tmpSequelizeModel: Sequelize.Model<any, any> | null;
    /** Validation helper */
    protected validator: Validator;
    /** Type/Strategy of saving the data */
    protected savingType: "insertOnly" | "insertOrUpdate";

    constructor() {
        super(VehiclePositions.lastPositions.name + "Model", {
            outputSequelizeAttributes: VehiclePositions.lastPositions.outputSequelizeAttributes,
            pgTableName: VehiclePositions.lastPositions.pgTableName,
            savingType: "insertOrUpdate",
        },
            new Validator(VehiclePositions.lastPositions.name + "ModelValidator",
                VehiclePositions.lastPositions.outputMongooseSchemaObject),
        );
    }

}
