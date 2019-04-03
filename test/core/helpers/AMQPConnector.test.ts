/// <reference path="../../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import { AMQPConnector } from "../../../src/core/helpers";
import { CustomError } from "../../../src/core/helpers/errors";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

// TODO gitlab connection to RabbitMQ not tunneled yet
describe.skip("AMQPConnector", () => {

    it("should has connect method", async () => {
        expect(AMQPConnector.connect).not.to.be.undefined;
    });

    it("should has getChannel method", async () => {
        expect(AMQPConnector.getChannel).not.to.be.undefined;
    });

    it("should throws Error if not connect method was not called", async () => {
        expect(AMQPConnector.getChannel).to.throw(CustomError);
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
