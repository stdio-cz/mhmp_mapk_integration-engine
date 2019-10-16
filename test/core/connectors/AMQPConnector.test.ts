"use strict";

import { CustomError } from "@golemio/errors";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { AMQPConnector } from "../../../src/core/connectors";

chai.use(chaiAsPromised);

describe("AMQPConnector", () => {

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
