/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

// gitlab connection to RabbitMQ not tunneled yet

/*
import "mocha";
import CustomError from "../../src/helpers/errors/CustomError";
const { AMQPConnector } = require("../../src/helpers/AMQPConnector");

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

describe("AMQPConnector", () => {

    it("should has connect method", async () => {
        expect(AMQPConnector.connect).not.to.be.undefined;
    });

    it("should has getChannel method", async () => {
        expect(AMQPConnector.getChannel).not.to.be.undefined;
    });

    it("should throws Error if not connect method was not called", async () => {
        expect(AMQPConnector.getChannel()).to.be.rejected;
    });

    it("should connects to RabbitMQ and returns channel", async () => {
        const ch = await AMQPConnector.connect();
        expect(ch).to.be.an.instanceof(Object);
    });

    it("should returns channel", async () => {
        await AMQPConnector.connect();
        expect(AMQPConnector.getChannel()).to.be.an.instanceof(Object);
    });

});
*/
