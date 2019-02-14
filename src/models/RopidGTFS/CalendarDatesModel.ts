"use strict";

import { RopidGTFS } from "data-platform-schema-definitions";
import * as Sequelize from "sequelize";
import Validator from "../../helpers/Validator";
import IModel from "../IModel";
import PostgresModel from "../PostgresModel";

const { PostgresConnector } = require("../../helpers/PostgresConnector");

export default class CalendarDatesModel extends PostgresModel implements IModel {

    public name: string;
    protected sequelizeModel: Sequelize.Model<any, any>;
    protected tmpSequelizeModel: Sequelize.Model<any, any>;
    protected validator: Validator;

    constructor() {
        super();
        this.name = RopidGTFS.calendar_dates.name;

        this.sequelizeModel = PostgresConnector.getConnection().define(RopidGTFS.calendar_dates.pgTableName,
            RopidGTFS.calendar_dates.outputSequelizeAttributes);
        this.tmpSequelizeModel = PostgresConnector.getConnection().define(RopidGTFS.calendar_dates.tmpPgTableName,
            RopidGTFS.calendar_dates.outputSequelizeAttributes);
        // TODO doplnit validator
        this.validator = null; // new Validator(this.name, schemaObject);
    }

}
