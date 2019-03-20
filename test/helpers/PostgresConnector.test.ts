/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import CustomError from "../../src/helpers/errors/CustomError";
const { PostgresConnector } = require("../../src/helpers/PostgresConnector");

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

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

    it("should connects to RabbitMQ and returns channel", async () => {
        const ch = await PostgresConnector.connect();
        expect(ch).to.be.an.instanceof(Object);
    });

    it("should returns channel", async () => {
        await PostgresConnector.connect();
        expect(PostgresConnector.getConnection()).to.be.an.instanceof(Object);
    });

});
