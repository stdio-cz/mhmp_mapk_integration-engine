/// <reference path="../../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import * as Sequelize from "sequelize";
import { PostgresConnector } from "../../../src/core/connectors";
import { PostgresModel } from "../../../src/core/models";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

describe.skip("PostgresModel", () => {

    let model;
    let sequelizeAttributes: Sequelize.DefineModelAttributes<any>;

    before(async () => {
        await PostgresConnector.connect();
    });

    beforeEach(() => {
        sequelizeAttributes = {
            column1: Sequelize.INTEGER,
            column2: Sequelize.STRING,

            created_at: { type: Sequelize.DATE },
            updated_at: { type: Sequelize.DATE },
        };

        model = new PostgresModel("Test" + "Model", {
                hasTmpTable: true,
                outputSequelizeAttributes: sequelizeAttributes,
                pgTableName: "test",
                savingType: "insertOnly",
            },
            null,
        );
    });

    it("should TODO", async () => {
        await model.save({column1: 1, column2: "a"}, true);
        await model.save({column1: 3, column2: "c"}, true);
    });

});
