/// <reference path="../../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import { InfluxConnector } from "../../../src/core/connectors";
import { CustomError } from "../../../src/core/helpers/errors";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

describe.skip("InfluxConnector", () => {

    let schemas;

    beforeEach(() => {
        schemas = [];
    });

    it("should has connect method", async () => {
        expect(InfluxConnector.connect).not.to.be.undefined;
    });

    it("should has getConnection method", async () => {
        expect(InfluxConnector.getConnection).not.to.be.undefined;
    });

    it("should throws Error if not connect method was not called", async () => {
        expect(InfluxConnector.getConnection).to.throw(CustomError);
    });

    it("should connects to InfluxDB and returns connection", async () => {
        const ch = await InfluxConnector.connect(schemas);
        expect(ch).to.be.an.instanceof(Object);
    });

    it("should returns connection", async () => {
        await InfluxConnector.connect(schemas);
        expect(InfluxConnector.getConnection()).to.be.an.instanceof(Object);
    });

});
