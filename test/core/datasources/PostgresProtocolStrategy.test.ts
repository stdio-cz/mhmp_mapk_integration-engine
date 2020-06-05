"use strict";

import { CustomError } from "@golemio/errors";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import * as Sequelize from "sequelize";
import { PostgresConnector } from "../../../src/core/connectors";
import { IPostgresSettings, PostgresProtocolStrategy } from "../../../src/core/datasources";

import * as RawDaraStore from "../../../src/core/helpers/RawDaraStore";

import * as sinon from "sinon";

import { config } from "../../../src/core/config";
chai.use(chaiAsPromised);

describe("PostgresProtocolStrategy", () => {

    let testSettings: IPostgresSettings;
    let strategy: PostgresProtocolStrategy;
    let sandbox: any;

    before(async () => {
        const connection = await PostgresConnector.connect();
        await connection.query(
            "CREATE SCHEMA unittest; "
            + "CREATE TABLE unittest.test "
            + "( "
            + "id integer NOT NULL, "
            + "value character varying(255), "
            + "CONSTRAINT test_pkey PRIMARY KEY (id) "
            + "); "
            + "INSERT INTO unittest.test(id, value) VALUES "
            + "(1, 'a'), (2, 'b'); ",
            { type: Sequelize.QueryTypes.RAW },
        );
    });

    after(async () => {
        const connection = PostgresConnector.getConnection();
        // TODO doplnit batch_id a author
        await connection.query(
            "DROP TABLE unittest.test; "
            + "DROP SCHEMA unittest; ",
            { type: Sequelize.QueryTypes.RAW },
        );

    });

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        testSettings = {
            connectionString: config.POSTGRES_CONN,
            findOptions: {
                limit: 5,
            },
            modelAttributes: {
                id: { type: Sequelize.INTEGER, primaryKey: true },
                value: Sequelize.STRING,
            },
            schemaName: "unittest",
            sequelizeAdditionalSettings: {
                timestamps: false,
            },
            tableName: "test",
        };
        strategy = new PostgresProtocolStrategy(testSettings);

        sandbox.spy(strategy, "getRawData");
        sandbox.spy(RawDaraStore, "save");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should has getData method", async () => {
        expect(strategy.getData).not.to.be.undefined;
    });

    it("should has getRawData method", async () => {
        expect(strategy.getRawData).not.to.be.undefined;
    });

    it("should has getLastModified method", async () => {
        expect(strategy.getLastModified).not.to.be.undefined;
    });

    it("should has setConnectionSettings method", async () => {
        expect(strategy.setConnectionSettings).not.to.be.undefined;
    });

    it("should properly get data", async () => {
        const res = await strategy.getData();
        expect(res).to.be.deep.equal([{ id: 1, value: "a" }, { id: 2, value: "b" }]);
        sandbox.assert.calledOnce(strategy.getRawData);
        sandbox.assert.calledOnce(RawDaraStore.save);
    });

    it("should properly delete data", async () => {
        await strategy.deleteData();
        const res = await strategy.getData();
        expect(res).to.be.deep.equal([]);
    });

    it("should throw error if getting data failed", async () => {
        testSettings.connectionString = config.POSTGRES_CONN + "snvodsvnsvnsn";
        strategy.setConnectionSettings(testSettings);
        await expect(strategy.getData()).to.be.rejectedWith(CustomError);
    });

});
