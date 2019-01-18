"use strict";

import { RopidGTFS } from "data-platform-schema-definitions";
import * as Sequelize from "sequelize";
import Validator from "../../helpers/Validator";
import IModel from "../IModel";
import PostgresModel from "../PostgresModel";

const { PostgresConnector } = require("../../helpers/PostgresConnector");

export default class RoutesModel extends PostgresModel implements IModel {

    public name: string;
    protected sequelizeModel: Sequelize.Model<any, any>;
    protected validator: Validator;

    constructor() {
        super();
        this.name = RopidGTFS.routes.name;

        this.sequelizeModel = PostgresConnector.getConnection().define(RopidGTFS.routes.tmpPgTableName,
            RopidGTFS.routes.outputSequelizeAttributes);
        // TODO doplnit validator
        this.validator = null; // new Validator(this.name, schemaObject);
    }

}
