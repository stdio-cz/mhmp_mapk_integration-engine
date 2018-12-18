"use strict";

import { MerakiAccessPoints } from "data-platform-schema-definitions";
import * as Sequelize from "sequelize";
import Validator from "../helpers/Validator";
import IModel from "./IModel";
import PostgresModel from "./PostgresModel";

const { sequelizeConnection } = require("../helpers/PostgresConnector");

export default class MerakiAccessPointsObservationsModel extends PostgresModel implements IModel {

    public name: string;
    protected sequelizeModel: Sequelize.Model<any, any>;
    protected validator: Validator;

    constructor() {
        super();
        this.name = MerakiAccessPoints.observations.name;

        this.sequelizeModel = sequelizeConnection.define(MerakiAccessPoints.observations.pgTableName,
            MerakiAccessPoints.observations.outputSequelizeAttributes);
        // TODO doplnit validator
        this.validator = null; // new Validator(this.name, schemaObject);
    }

}
