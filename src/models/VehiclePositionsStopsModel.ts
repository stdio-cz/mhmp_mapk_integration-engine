"use strict";

import { VehiclePositions } from "data-platform-schema-definitions";
import * as Sequelize from "sequelize";
import CustomError from "../helpers/errors/CustomError";
import Validator from "../helpers/Validator";
import IModel from "./IModel";
import PostgresModel from "./PostgresModel";

const { PostgresConnector } = require("../helpers/PostgresConnector");

export default class VehiclePositionsStopsModel extends PostgresModel implements IModel {

    public name: string;
    protected sequelizeModel: Sequelize.Model<any, any>;
    protected validator: Validator;

    constructor() {
        super();
        this.name = VehiclePositions.stops.name;

        this.sequelizeModel = PostgresConnector.getConnection().define(VehiclePositions.stops.pgTableName,
            VehiclePositions.stops.outputSequelizeAttributes);
        this.sequelizeModel.removeAttribute("id");
        this.validator = new Validator(this.name, VehiclePositions.stops.outputMongooseSchemaObject);
    }

    /**
     * Overrides PostgresModel::SaveToDb
     */
    public SaveToDb = async (data: any): Promise<any> => {
        // data validation
        if (this.validator) {
            await this.validator.Validate(data);
        }

        try {
            await this.sequelizeModel.sync();

            if (data instanceof Array) {
                const promises = data.map((d) => {
                    return this.sequelizeModel.upsert(d);
                });
                await Promise.all(promises);
            } else {
                return await this.sequelizeModel.upsert(data);
            }
        } catch (err) {
            throw new CustomError("Error while saving to database.", true, this.name, 1003, err);
        }
    }
}
