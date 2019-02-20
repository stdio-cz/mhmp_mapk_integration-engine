"use strict";

import * as Sequelize from "sequelize";
import CustomError from "../helpers/errors/CustomError";
import log from "../helpers/Logger";
import Validator from "../helpers/Validator";
import { IModel2, ISequelizeSettings } from "./IModel2";

const { PostgresConnector } = require("../helpers/PostgresConnector");

export default class PostgresModel2 implements IModel2 {

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

    constructor(name: string, settings: ISequelizeSettings, validator: Validator) {
        this.name = name;

        this.sequelizeModel = PostgresConnector.getConnection().define(settings.pgTableName,
            settings.outputSequelizeAttributes, settings.sequelizeAdditionalSettings);

        if (settings.tmpPgTableName) {
            this.tmpSequelizeModel = PostgresConnector.getConnection().define(settings.tmpPgTableName,
                settings.outputSequelizeAttributes, settings.sequelizeAdditionalSettings);
        } else {
            this.tmpSequelizeModel = null;
        }

        if (settings.attributesToRemove.length > 0) {
            settings.attributesToRemove.forEach((atr) => {
                this.sequelizeModel.removeAttribute(atr);
                if (this.tmpSequelizeModel) {
                    this.tmpSequelizeModel.removeAttribute(atr);
                }
            });
        }

        this.validator = validator;

        this.savingType = settings.savingType;
    }

    public save = async (data: any, useTmpTable: boolean = false): Promise<any> => {
        // data validation
        if (this.validator) {
            await this.validator.Validate(data);
        }

        const model = (!useTmpTable) ? this.sequelizeModel : this.tmpSequelizeModel;

        await model.sync();

        switch (this.savingType) {
            case "insertOnly":
                return this.insertOnly(model, data);
            case "insertOrUpdate":
                return this.insertOrUpdate(model, data);
            default:
                throw new CustomError("The model saving type was not specified. Data was not saved.",
                    true, this.name, 1024);
        }

    }

    public truncate = async (useTmpTable: boolean = false): Promise<any> => {

        const model = (!useTmpTable) ? this.sequelizeModel : this.tmpSequelizeModel;

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

    public find = async (opts: Sequelize.SearchPathOptions, useTmpTable: boolean = false): Promise<any> => {
        const model = (!useTmpTable) ? this.sequelizeModel : this.tmpSequelizeModel;
        try {
            await model.sync();
            return await model.findAll(opts);
        } catch (err) {
            throw new CustomError("Error while getting from database.", true, this.name, 1023, err);
        }
    }

    public findOne = async (opts: Sequelize.SearchPathOptions, useTmpTable: boolean = false): Promise<any> => {
        const model = (!useTmpTable) ? this.sequelizeModel : this.tmpSequelizeModel;
        try {
            await model.sync();
            return await model.findOne(opts);
        } catch (err) {
            throw new CustomError("Error while getting from database.", true, this.name, 1023, err);
        }
    }

    public findAndCountAll = async (opts: Sequelize.SearchPathOptions, useTmpTable: boolean = false): Promise<any> => {
        const model = (!useTmpTable) ? this.sequelizeModel : this.tmpSequelizeModel;
        try {
            await model.sync();
            return await model.findAndCountAll(opts);
        } catch (err) {
            throw new CustomError("Error while getting from database.", true, this.name, 1023, err);
        }
    }

    protected insertOnly = async (model: Sequelize.Model<any, any>, data: any): Promise<any> => {
        const connection = PostgresConnector.getConnection();
        const t = await connection.transaction();

        try {
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

    protected insertOrUpdate = async (model: Sequelize.Model<any, any>, data: any): Promise<any> => {
        const connection = PostgresConnector.getConnection();
        const t = await connection.transaction();

        try {
            if (data instanceof Array) {
                const promises = data.map((d) => {
                    return model.upsert(d, {transaction: t});
                });
                await Promise.all(promises);
            } else {
                await model.upsert(data, {transaction: t});
            }
            return await t.commit();
        } catch (err) {
            await t.rollback();
            throw new CustomError("Error while saving to database.", true, this.name, 1003, err);
        }
    }

}
