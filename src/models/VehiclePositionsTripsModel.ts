"use strict";

import { VehiclePositionsTrips as attributes } from "data-platform-schema-definitions";
import * as Sequelize from "sequelize";
import Validator from "../helpers/Validator";
import IModel from "./IModel";
import PostgresModel from "./PostgresModel";

const { sequelizeConnection } = require("../helpers/PostgresConnector");

export default class VehiclePositionsTrips extends PostgresModel implements IModel {

    public name: string;
    protected sequelizeModel: Sequelize.Model<any, any>;
    protected validator: Validator;

    constructor() {
        super();
        this.name = "VehiclePositionsTrips";

        this.sequelizeModel = sequelizeConnection.define("vehicle_positions_trips", attributes);
        // this.validator = new Validator(this.name, schemaObject);
        this.validator = null;
    }

}
