"use strict";

import * as Sequelize from "sequelize";
import CustomError from "../helpers/errors/CustomError";
import log from "../helpers/Logger";
import Validator from "../helpers/Validator";
import BaseModel from "./BaseModel";

const { PostgresConnector } = require("../helpers/PostgresConnector");

export default abstract class PostgresModel extends BaseModel {

    /** Model name */
    public abstract name: string;
    /** The Sequelize Model */
    protected abstract sequelizeModel: Sequelize.Model<any, any>;
    /** The Sequelize Model */
    protected tmpSequelizeModel: Sequelize.Model<any, any>;
    /** Validation helper */
    protected abstract validator: Validator;

    constructor() {
        super();
        this.tmpSequelizeModel = null;
    }

    /**
     * Validates and Saves transformed element or collection to database.
     *
     * @param data Whole FeatureCollection to be saved into DB, or single item to be saved
     */
    public SaveToDb = async (data: any, tmp: boolean = false): Promise<any> => {
        // data validation
        if (this.validator) {
            await this.validator.Validate(data);
        }

        const model = (!tmp) ? this.sequelizeModel : this.tmpSequelizeModel;

        const connection = PostgresConnector.getConnection();
        const t = await connection.transaction();

        try {
            await model.sync();

            if (data instanceof Array) {
                await model.bulkCreate(data, {transaction: t});
            } else {
                await model.create(data, {transaction: t});
            }
            return await t.commit();
        } catch (err) {
            log.error(JSON.stringify({errors: err.errors, fields: err.fields}));
            await t.rollback();
            throw new CustomError("Error while saving to database.", true, this.name, 1003, err);
        }
    }

    /**
     * Deletes all data from table.
     */
    public Truncate = async (tmp: boolean = false): Promise<any> => {
        const model = (!tmp) ? this.sequelizeModel : this.tmpSequelizeModel;

        const connection = PostgresConnector.getConnection();
        const t = await connection.transaction();

        try {
            await model.sync();
            await model.destroy({
                cascade: false,
                transaction: t,
                truncate: true,
            });
            return await t.commit();
        } catch (err) {
            await t.rollback();
            throw new CustomError("Error while truncating data.", true, this.name, 1011, err);
        }
    }

    public FindAndCountAll = async (opts: any, tmp: boolean = false): Promise<any> => {
        const model = (!tmp) ? this.sequelizeModel : this.tmpSequelizeModel;
        try {
            await model.sync();
            return await model.findAndCountAll(opts);
        } catch (err) {
            throw new CustomError("Error while getting from database.", true, this.name, 1023, err);
        }
    }

}
