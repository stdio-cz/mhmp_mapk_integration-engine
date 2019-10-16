"use strict";

import { CustomError } from "@golemio/errors";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { Connection } from "mongoose";
import { MongoConnector } from "../../../src/core/connectors";

chai.use(chaiAsPromised);

describe("MongoConnector", () => {

    it("should has connect method", async () => {
        expect(MongoConnector.connect).not.to.be.undefined;
    });

    it("should has getConnection method", async () => {
        expect(MongoConnector.getConnection).not.to.be.undefined;
    });

    it("should throws Error if not connect method was not called", () => {
        expect(MongoConnector.getConnection).to.throw(CustomError);
    });

    it("should connects to MongoDB and returns connection", async () => {
        const ch = await MongoConnector.connect();
        expect(ch).to.be.an.instanceof(Connection);
    });

    it("should returns connection", async () => {
        await MongoConnector.connect();
        expect(MongoConnector.getConnection()).to.be.an.instanceof(Connection);
    });

});
