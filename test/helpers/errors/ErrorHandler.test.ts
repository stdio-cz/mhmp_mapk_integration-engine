/// <reference path="../../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import CustomError from "../../../src/helpers/errors/CustomError";
import handleError from "../../../src/helpers/errors/ErrorHandler";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
const sinon = require("sinon");

chai.use(chaiAsPromised);

describe("ErrorHandler", () => {

    let sandbox;
    let exitStub;

    beforeEach(() => {
        sandbox = sinon.createSandbox({ useFakeTimers : true });
        exitStub = sandbox.stub(process, "exit");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should handle non-operational error", async () => {
        handleError(new Error("Test"));
        sinon.assert.called(exitStub);
    });

    it("should handle operational error", async () => {
        handleError(new CustomError("Test", true, "TestError", 1));
        sinon.assert.notCalled(exitStub);
    });

});
