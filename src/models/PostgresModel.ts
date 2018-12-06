"use strict";

import * as Sequelize from "sequelize";
import CustomError from "../helpers/errors/CustomError";
import Validator from "../helpers/Validator";
import BaseModel from "./BaseModel";

export default abstract class PostgresModel extends BaseModel {

    /** Model name */
    public abstract name: string;
    /** The Sequelize Model */
    protected abstract sequelizeModel: Sequelize.Model<any, any>;
    /** Validation helper */
    protected abstract validator: Validator;

    constructor() {
        super();
    }

    /**
     * Validates and Saves transformed element or collection to database.
     *
     * @param data Whole FeatureCollection to be saved into DB, or single item to be saved
     */
    public SaveToDb = async (data: any): Promise<any> => {
        // data validation
        if (this.validator) {
            await this.validator.Validate(data);
        }

        try {
            await this.sequelizeModel.sync();

            if (data instanceof Array) {
                return await this.sequelizeModel.bulkCreate(data);
            } else {
                return await this.sequelizeModel.create(data);
            }
        } catch (err) {
            throw new CustomError("Error while saving to database.", true, this.name, 1003, err);
        }
    }

    /**
     * Deletes all data from table.
     */
    public Truncate = async (): Promise<any> => {
        try {
            await this.sequelizeModel.sync();
            await this.sequelizeModel.destroy({
                cascade: false,
                truncate: true,
            });
        } catch (err) {
            throw new CustomError("Error while truncating data.", true, this.name, 1011, err);
        }
    }

}
