"use strict";

import { Validator } from "golemio-validator";
import * as Sequelize from "sequelize";
import { PostgresConnector } from "../connectors";
import { log } from "../helpers";
import { CustomError } from "../helpers/errors";
import { IModel, ISequelizeSettings } from "./";

export class PostgresModel implements IModel {

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
            settings.outputSequelizeAttributes, { ...settings.sequelizeAdditionalSettings, schema: "public" });

        if (settings.hasTmpTable) {
            this.tmpSequelizeModel = PostgresConnector.getConnection().define(settings.pgTableName,
                settings.outputSequelizeAttributes, { ...settings.sequelizeAdditionalSettings, schema: "tmp" });
        } else {
            this.tmpSequelizeModel = undefined;
        }

        if (settings.attributesToRemove) {
            settings.attributesToRemove.forEach((attr) => {
                this.sequelizeModel.removeAttribute(attr);
                if (this.tmpSequelizeModel) {
                    this.tmpSequelizeModel.removeAttribute(attr);
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
        } else {
            log.warn(this.name + ": Model validator is not set.");
        }

        const model = await this.getSequelizeModelSafely(useTmpTable);

        // calling the method based on savingType (this.insertOnly() or this.insertOrUpdate())
        return this[this.savingType](model, data);
    }

    public truncate = async (useTmpTable: boolean = false): Promise<any> => {
        const model = await this.getSequelizeModelSafely(useTmpTable);

        const connection = PostgresConnector.getConnection();
        const t = await connection.transaction();

        try {
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

    public find = async (opts: object, useTmpTable: boolean = false): Promise<any> => {
        const model = await this.getSequelizeModelSafely(useTmpTable);
        try {
            return await model.findAll(opts);
        } catch (err) {
            throw new CustomError("Error while getting from database.", true, this.name, 1023, err);
        }
    }

    public findOne = async (opts: object, useTmpTable: boolean = false): Promise<any> => {
        const model = await this.getSequelizeModelSafely(useTmpTable);
        try {
            return await model.findOne(opts);
        } catch (err) {
            throw new CustomError("Error while getting from database.", true, this.name, 1023, err);
        }
    }

    public findAndCountAll = async (opts: object, useTmpTable: boolean = false): Promise<any> => {
        const model = await this.getSequelizeModelSafely(useTmpTable);
        try {
            return await model.findAndCountAll(opts);
        } catch (err) {
            throw new CustomError("Error while getting from database.", true, this.name, 1023, err);
        }
    }

    private insertOnly = async (model: Sequelize.Model<any, any>, data: any): Promise<any> => {
        try {
            if (data instanceof Array) {
                await model.bulkCreate(data);
            } else {
                await model.create(data);
            }
        } catch (err) {
            log.error(JSON.stringify({ errors: err.errors, fields: err.fields }));
            throw new CustomError("Error while saving to database.", true, this.name, 1003, err);
        }
    }

    private insertOrUpdate = async (model: Sequelize.Model<any, any>, data: any): Promise<any> => {
        const connection = PostgresConnector.getConnection();
        const t = await connection.transaction();

        try {
            if (data instanceof Array) {
                const promises = data.map(async (d) => {
                    await model.upsert(d, { transaction: t });
                });
                await Promise.all(promises);
            } else {
                await model.upsert(data, { transaction: t });
            }
            return await t.commit();
        } catch (err) {
            log.error(JSON.stringify({ errors: err.errors, fields: err.fields }));
            await t.rollback();
            throw new CustomError("Error while saving to database.", true, this.name, 1003, err);
        }
    }

    private getSequelizeModelSafely = async (useTmpTable: boolean): Promise<Sequelize.Model<any, any>> => {
        let model = this.sequelizeModel;
        if (useTmpTable && this.tmpSequelizeModel) {
            model = this.tmpSequelizeModel;
            /// synchronizing only tmp model
            await model.sync();
        } else if (useTmpTable && !this.tmpSequelizeModel) {
            throw new CustomError("Temporary model is not defined.", true, this.name);
        }
        return model;
    }

}
