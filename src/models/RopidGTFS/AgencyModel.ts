"use strict";

import { RopidGTFS } from "data-platform-schema-definitions";
import * as Sequelize from "sequelize";
import Validator from "../../helpers/Validator";
import IModel from "../IModel";
import PostgresModel from "../PostgresModel";

const { sequelizeConnection } = require("../../helpers/PostgresConnector");

export default class AgencyModel extends PostgresModel implements IModel {

    public name: string;
    protected sequelizeModel: Sequelize.Model<any, any>;
    protected validator: Validator;

    constructor() {
        super();
        this.name = "RopidGTFSAgency";

        this.sequelizeModel = sequelizeConnection.define("test_agency", RopidGTFS.agency);
        // TODO doplnit validator
        this.validator = null; // new Validator(this.name, schemaObject);
    }

}
