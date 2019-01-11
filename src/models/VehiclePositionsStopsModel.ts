"use strict";

import { VehiclePositions } from "data-platform-schema-definitions";
import * as Sequelize from "sequelize";
import Validator from "../helpers/Validator";
import IModel from "./IModel";
import PostgresModel from "./PostgresModel";

const { PostgresConnector } = require("../helpers/PostgresConnector");

export default class VehiclePositionsStopsModel extends PostgresModel implements IModel {

    public name: string;
    protected sequelizeModel: Sequelize.Model<any, any>;
    protected validator: Validator;

    constructor() {
        super();
        this.name = VehiclePositions.stops.name;

        this.sequelizeModel = PostgresConnector.getConnection().define(VehiclePositions.stops.pgTableName,
            VehiclePositions.stops.outputSequelizeAttributes);
        this.validator = new Validator(this.name, VehiclePositions.stops.outputMongooseSchemaObject);
    }

}
