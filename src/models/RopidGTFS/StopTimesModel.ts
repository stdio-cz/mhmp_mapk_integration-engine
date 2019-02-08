"use strict";

import { RopidGTFS } from "data-platform-schema-definitions";
import * as Sequelize from "sequelize";
import Validator from "../../helpers/Validator";
import IModel from "../IModel";
import PostgresModel from "../PostgresModel";

const { PostgresConnector } = require("../../helpers/PostgresConnector");

export default class StopTimesModel extends PostgresModel implements IModel {

    public name: string;
    protected sequelizeModel: Sequelize.Model<any, any>;
    protected tmpSequelizeModel: Sequelize.Model<any, any>;
    protected validator: Validator;

    constructor() {
        super();
        this.name = RopidGTFS.stop_times.name;

        this.sequelizeModel = PostgresConnector.getConnection().define(RopidGTFS.stop_times.pgTableName,
            RopidGTFS.stop_times.outputSequelizeAttributes);
        this.sequelizeModel.removeAttribute("id");
        this.tmpSequelizeModel = PostgresConnector.getConnection().define(RopidGTFS.stop_times.tmpPgTableName,
            RopidGTFS.stop_times.outputSequelizeAttributes);
        this.tmpSequelizeModel.removeAttribute("id");
        // TODO doplnit validator
        this.validator = null; // new Validator(this.name, schemaObject);
    }

}
