"use strict";

import { RopidGTFS } from "data-platform-schema-definitions";
import * as Sequelize from "sequelize";
import Validator from "../../helpers/Validator";
import IModel from "../IModel";
import PostgresModel from "../PostgresModel";

const { PostgresConnector } = require("../../helpers/PostgresConnector");

export default class ShapesModel extends PostgresModel implements IModel {

    public name: string;
    protected sequelizeModel: Sequelize.Model<any, any>;
    protected tmpSequelizeModel: Sequelize.Model<any, any>;
    protected validator: Validator;

    constructor() {
        super();
        this.name = RopidGTFS.shapes.name;

        this.sequelizeModel = PostgresConnector.getConnection().define(RopidGTFS.shapes.pgTableName,
            RopidGTFS.shapes.outputSequelizeAttributes);
        this.tmpSequelizeModel = PostgresConnector.getConnection().define(RopidGTFS.shapes.tmpPgTableName,
            RopidGTFS.shapes.outputSequelizeAttributes);
        // TODO doplnit validator
        this.validator = null; // new Validator(this.name, schemaObject);
    }

}
