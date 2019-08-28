"use strict";

import { CustomError } from "@golemio/errors";
import "mocha";
import { IntegrationErrorHandler } from "../../../src/core/helpers";

import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as sinon from "sinon";

chai.use(chaiAsPromised);

describe("IntegrationErrorHandler", () => {

    let sandbox: any;
    let exitStub: any;
    let tmpNodeEnv: string | undefined;

    before(() => {
        tmpNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "test";
    });

    after(() => {
        process.env.NODE_ENV = tmpNodeEnv;
    });

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        exitStub = sandbox.stub(process, "exit");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should handle non-operational error", async () => {
        IntegrationErrorHandler.handle(new Error("Test"));
        sinon.assert.called(exitStub);
    });

    it("should handle operational error", async () => {
        IntegrationErrorHandler.handle(new CustomError("Test", true, "TestError", 1, new Error("err").toString()));
        sinon.assert.notCalled(exitStub);
    });

    it("should handle non-operational error and exit with specific error code", async () => {
        IntegrationErrorHandler.handle(new CustomError("Test", false, "test", 1001));
        sinon.assert.called(exitStub);
        sinon.assert.calledWith(exitStub, 1001);
    });

    it("should handle operational warning", async () => {
        const errObject = IntegrationErrorHandler.handle(new CustomError("Test", true, "test", 5001));
        sinon.assert.notCalled(exitStub);
        expect(errObject.ack).to.be.true;
    });

    it("should handle operational error", async () => {
        const errObject = IntegrationErrorHandler.handle(new CustomError("Test", true, "test", 5002));
        sinon.assert.notCalled(exitStub);
        expect(errObject.ack).to.be.false;
    });

});
