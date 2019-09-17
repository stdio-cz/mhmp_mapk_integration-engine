"use strict";

import { CustomError } from "@golemio/errors";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { PostgresConnector } from "../../../src/core/connectors";

chai.use(chaiAsPromised);

describe("PostgresConnector", () => {

    it("should has connect method", async () => {
        expect(PostgresConnector.connect).not.to.be.undefined;
    });

    it("should has getConnection method", async () => {
        expect(PostgresConnector.getConnection).not.to.be.undefined;
    });

    it("should throws Error if not connect method was not called", () => {
        expect(PostgresConnector.getConnection).to.throw(CustomError);
    });

    it("should connects to PostgreSQL and returns connection", async () => {
        const ch = await PostgresConnector.connect();
        expect(ch).to.be.an.instanceof(Object);
    });

    it("should returns connection", async () => {
        await PostgresConnector.connect();
        expect(PostgresConnector.getConnection()).to.be.an.instanceof(Object);
    });

});
