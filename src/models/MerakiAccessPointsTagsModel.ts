"use strict";

import { MerakiAccessPoints } from "data-platform-schema-definitions";
import * as Sequelize from "sequelize";
import CustomError from "../helpers/errors/CustomError";
import Validator from "../helpers/Validator";
import IModel from "./IModel";
import PostgresModel from "./PostgresModel";

const { sequelizeConnection } = require("../helpers/PostgresConnector");

export default class MerakiAccessPointsTagsModel extends PostgresModel implements IModel {

    public name: string;
    protected sequelizeModel: Sequelize.Model<any, any>;
    protected validator: Validator;

    constructor() {
        super();
        this.name = MerakiAccessPoints.tags.name;

        this.sequelizeModel = sequelizeConnection.define(MerakiAccessPoints.tags.pgTableName,
            MerakiAccessPoints.tags.outputSequelizeAttributes);
        // TODO doplnit validator
        this.validator = null; // new Validator(this.name, schemaObject);
    }

    /**
     * Overrides PostgresModel::SaveToDb
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
                return await this.sequelizeModel.bulkCreate(data,
                    { ignoreDuplicates: true });
            } else {
                return await this.sequelizeModel.create(data);
            }
        } catch (err) {
            throw new CustomError("Error while saving to database.", true, this.name, 1003, err);
        }
    }

}
