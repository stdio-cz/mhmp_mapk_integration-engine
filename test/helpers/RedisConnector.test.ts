/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import CustomError from "../../src/helpers/errors/CustomError";
const { RedisConnector } = require("../../src/helpers/RedisConnector");

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

describe("RedisConnector", () => {

    it("should has connect method", async () => {
        expect(RedisConnector.connect).not.to.be.undefined;
    });

    it("should has getConnection method", async () => {
        expect(RedisConnector.getConnection).not.to.be.undefined;
    });

    it("should throws Error if not connect method was not called", () => {
        expect(RedisConnector.getConnection).to.throw(CustomError);
    });

    it("should connects to RabbitMQ and returns channel", async () => {
        const ch = await RedisConnector.connect();
        expect(ch).to.be.an.instanceof(Object);
    });

    it("should returns channel", async () => {
        await RedisConnector.connect();
        expect(RedisConnector.getConnection()).to.be.an.instanceof(Object);
    });

});
