/// <reference path="../../../node_modules/@types/node/index.d.ts" />

"use strict";

import { Validator } from "golemio-validator";
import "mocha";
import { SchemaDefinition } from "mongoose";
import * as Sequelize from "sequelize";
import { PostgresConnector } from "../../../src/core/connectors";
import { log } from "../../../src/core/helpers";
import { CustomError } from "../../../src/core/helpers/errors";
import { ISequelizeSettings, PostgresModel } from "../../../src/core/models";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
const sinon = require("sinon");

chai.use(chaiAsPromised);

describe("PostgresModel", () => {

    let sandbox;
    let tableName;
    let schemaObject: SchemaDefinition;
    let settings: ISequelizeSettings;
    let model: PostgresModel;
    let sequelizeAttributes: Sequelize.DefineModelAttributes<any>;
    let connection;

    before(async () => {
        await PostgresConnector.connect();
    });

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
        sandbox.spy(log, "warn");
        connection = PostgresConnector.getConnection();

        tableName = "test";
        sequelizeAttributes = {
            column1: Sequelize.INTEGER,
            column2: Sequelize.STRING,
            created_at: { type: Sequelize.DATE },
            updated_at: { type: Sequelize.DATE },
        };
        schemaObject = {
            column1: { type: Number },
            column2: { type: String, required: true },
        };
        settings = {
            outputSequelizeAttributes: sequelizeAttributes,
            pgTableName: tableName,
            savingType: "insertOnly",
        };
        model = new PostgresModel("Test" + "Model",
            settings,
            new Validator("TestPostgresModelValidator", schemaObject),
        );

        await connection.query(
            "CREATE TABLE public.test ( "
            + "id serial NOT NULL, "
            + "column1 integer, "
            + "column2 character varying(255), "
            + "created_at timestamp with time zone, "
            + "updated_at timestamp with time zone, "
            + "CONSTRAINT test_pkey PRIMARY KEY (id));",
            { type: Sequelize.QueryTypes.SELECT });
        await connection.query(
            "CREATE SCHEMA IF NOT EXISTS tmp;",
            { type: Sequelize.QueryTypes.SELECT });
    });

    afterEach(async () => {
        sandbox.restore();
        await connection.query(
            "DROP TABLE IF EXISTS public." + tableName + "; "
            + "DROP TABLE IF EXISTS tmp." + tableName + "; ",
            { type: Sequelize.QueryTypes.SELECT });
    });

    it("should has name", () => {
        expect(model.name).not.to.be.undefined;
    });

    it("should has save method", () => {
        expect(model.save).not.to.be.undefined;
    });

    it("should has truncate method", () => {
        expect(model.truncate).not.to.be.undefined;
    });

    it("should has find method", () => {
        expect(model.find).not.to.be.undefined;
    });

    it("should has findOne method", () => {
        expect(model.findOne).not.to.be.undefined;
    });

    it("should has findAndCountAll method", () => {
        expect(model.findAndCountAll).not.to.be.undefined;
    });

    // method model.save()

    it("should throws error if data are not valid", async () => {
        expect(model.save({ column1: 1 })).to.be.rejectedWith(CustomError);
        expect(model.save({ column1: 1 }, true)).to.be.rejectedWith(CustomError);
    });

    it("should logs warning if validator is not set", async () => {
        model = new PostgresModel("Test" + "Model",
            settings,
            undefined,
        );
        expect(model.save({ column1: 1 })).to.be.rejectedWith(Error);
        expect(model.save({ column1: 1 }, true)).to.be.rejectedWith(Error);
        sandbox.assert.calledTwice(log.warn);
    });

    it("should throws error when save to tmp model and tmp model is not defined", async () => {
        model = new PostgresModel("Test" + "Model",
            settings,
            new Validator("TestPostgresModelValidator", schemaObject),
        );
        expect(model.save({ column1: 1, column2: "b" }, true)).to.be.rejectedWith(CustomError);
    });

    it("should saves one record, type insertOnly", async () => {
        settings.hasTmpTable = true;
        model = new PostgresModel("Test" + "Model",
            settings,
            new Validator("TestPostgresModelValidator", schemaObject),
        );
        await model.save({ column1: 1, column2: "b" });
        await model.save({ column1: 1, column2: "b" }, true);

        let data = await model.findOne({ where: { column1: 1 }});
        expect(data).to.have.property("column1", 1);
        expect(data).to.have.property("column2", "b");
        expect(data).to.have.property("created_at");
        expect(data).to.have.property("updated_at");

        data = await model.findOne({ where: { column1: 1 }}, true);
        expect(data).to.have.property("column1", 1);
        expect(data).to.have.property("column2", "b");
        expect(data).to.have.property("created_at");
        expect(data).to.have.property("updated_at");
    });

    it("should saves array of records, type insertOnly", async () => {
        settings.hasTmpTable = true;
        model = new PostgresModel("Test" + "Model",
            settings,
            new Validator("TestPostgresModelValidator", schemaObject),
        );
        await model.save([{ column1: 1, column2: "b" }, { column1: 2, column2: "c" }]);
        await model.save([{ column1: 1, column2: "b" }, { column1: 2, column2: "c" }], true);

        let data = await model.find({});
        expect(data.length).to.equal(2);

        data = await model.find({}, true);
        expect(data.length).to.equal(2);
    });

    it("should saves one record, type insertOrUpdate", async () => {
        settings.hasTmpTable = true;
        settings.savingType = "insertOrUpdate";
        model = new PostgresModel("Test" + "Model",
            settings,
            new Validator("TestPostgresModelValidator", schemaObject),
        );
        await model.save({ id: 1, column1: 1, column2: "b" });
        let data = await model.findOne({ where: { id: 1 }});
        expect(data).to.have.property("column2", "b");

        await model.save({ id: 1, column1: 1, column2: "c" });
        data = await model.findOne({ where: { id: 1 }});
        expect(data).to.have.property("column2", "c");

        await model.save({ id: 1, column1: 1, column2: "b" }, true);
        data = await model.findOne({ where: { id: 1 }}, true);
        expect(data).to.have.property("column2", "b");

        await model.save({ id: 1, column1: 1, column2: "c" }, true);
        data = await model.findOne({ where: { id: 1 }}, true);
        expect(data).to.have.property("column2", "c");
    });

    it("should saves array of records, type insertOrUpdate", async () => {
        settings.hasTmpTable = true;
        settings.savingType = "insertOrUpdate";
        model = new PostgresModel("Test" + "Model",
            settings,
            new Validator("TestPostgresModelValidator", schemaObject),
        );
        await model.save([{ id: 1, column1: 1, column2: "b" }, { id: 2, column1: 2, column2: "c" }]);
        let data = await model.findOne({ where: { id: 1 }});
        expect(data).to.have.property("column2", "b");
        await model.save([{ id: 1, column1: 1, column2: "c" }, { id: 2, column1: 2, column2: "d" }]);
        data = await model.findOne({ where: { id: 1 }});
        expect(data).to.have.property("column2", "c");

        await model.save([{ id: 1, column1: 1, column2: "b" }, { id: 2, column1: 2, column2: "c" }], true);
        data = await model.findOne({ where: { id: 1 }}, true);
        expect(data).to.have.property("column2", "b");
        await model.save([{ id: 1, column1: 1, column2: "c" }, { id: 2, column1: 2, column2: "d" }], true);
        data = await model.findOne({ where: { id: 1 }}, true);
        expect(data).to.have.property("column2", "c");

        data = await model.find({});
        expect(data.length).to.equal(2);

        data = await model.find({}, true);
        expect(data.length).to.equal(2);
    });

    // method model.truncate()

    it("should throws error when truncate tmp model and tmp model is not defined", async () => {
        model = new PostgresModel("Test" + "Model",
            settings,
            new Validator("TestPostgresModelValidator", schemaObject),
        );
        expect(model.truncate(true)).to.be.rejectedWith(CustomError);
    });

    it("should truncate", async () => {
        settings.hasTmpTable = true;
        model = new PostgresModel("Test" + "Model",
            settings,
            new Validator("TestPostgresModelValidator", schemaObject),
        );

        await model.save({ column1: 1, column2: "b" });
        await model.save({ column1: 1, column2: "b" }, true);
        let data = await model.find({});
        expect(data.length).to.equal(1);
        data = await model.find({}, true);
        expect(data.length).to.equal(1);

        await model.truncate();
        await model.truncate(true);
        data = await model.find({});
        expect(data.length).to.equal(0);
        data = await model.find({}, true);
        expect(data.length).to.equal(0);
    });

    // method model.find()

    it("should returns an array of records", async () => {
        settings.hasTmpTable = true;
        model = new PostgresModel("Test" + "Model",
            settings,
            new Validator("TestPostgresModelValidator", schemaObject),
        );
        await model.save({ column1: 1, column2: "b" });
        await model.save({ column1: 1, column2: "b" }, true);

        let data = await model.find({});
        expect(data).to.be.an("array");
        expect(data.length).to.equal(1);

        data = await model.find({}, true);
        expect(data).to.be.an("array");
        expect(data.length).to.equal(1);
    });

    // method model.findOne()

    it("should returns a one record", async () => {
        settings.hasTmpTable = true;
        model = new PostgresModel("Test" + "Model",
            settings,
            new Validator("TestPostgresModelValidator", schemaObject),
        );

        await model.save({ column1: 1, column2: "b" });
        await model.save({ column1: 1, column2: "b" }, true);

        let data = await model.findOne({ where: { column1: 1 }});
        expect(data).to.have.property("column1", 1);
        expect(data).to.have.property("column2", "b");
        expect(data).to.have.property("created_at");
        expect(data).to.have.property("updated_at");

        data = await model.findOne({ where: { column1: 1 }}, true);
        expect(data).to.have.property("column1", 1);
        expect(data).to.have.property("column2", "b");
        expect(data).to.have.property("created_at");
        expect(data).to.have.property("updated_at");
    });

    // method model.findAndCountAll()

    it("should returns count and an array of records", async () => {
        settings.hasTmpTable = true;
        model = new PostgresModel("Test" + "Model",
            settings,
            new Validator("TestPostgresModelValidator", schemaObject),
        );
        await model.save({ column1: 1, column2: "b" });
        await model.save({ column1: 1, column2: "b" }, true);

        let data = await model.findAndCountAll({});
        expect(data).to.have.property("count", 1);
        expect(data).to.have.property("rows");
        expect(data.rows).to.be.an("array");
        expect(data.rows.length).to.equal(1);

        data = await model.findAndCountAll({}, true);
        expect(data).to.have.property("count", 1);
        expect(data).to.have.property("rows");
        expect(data.rows).to.be.an("array");
        expect(data.rows.length).to.equal(1);
    });

});
