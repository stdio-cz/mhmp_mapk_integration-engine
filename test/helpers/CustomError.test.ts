/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import CustomError from "../../src/helpers/errors/CustomError";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

describe("CustomError", () => {

    let error1: CustomError;
    let error2: CustomError;
    let error3: CustomError;
    let error4: CustomError;
    let tmpNodeEnv;

    before(() => {
        tmpNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "test";
    });

    after(() => {
        process.env.NODE_ENV = tmpNodeEnv;
    });

    beforeEach(() => {
        error1 = new CustomError("Test error");
        error2 = new CustomError("Test error", true);
        error3 = new CustomError("Test error", true, 3);
        error4 = new CustomError("Test error", true, 4, "Additional info");
    });

    it("should properly returns error description as string", async () => {
        expect(error1.toString()).to.be.equal("Test error");
        expect(error2.toString()).to.be.equal("Test error");
        expect(error3.toString()).to.be.equal("[3] Test error");
        expect(error4.toString()).to.be.equal("[4] Test error (Additional info)");
    });

    it("should properly returns error description as object", async () => {
        expect(error1.toObject()).to.have.property("error_message");
        expect(error2.toObject()).to.have.property("error_message");
        expect(error3.toObject()).to.have.property("error_message");
        expect(error3.toObject()).to.have.property("error_code");
        expect(error4.toObject()).to.have.property("error_message");
        expect(error4.toObject()).to.have.property("error_code");
        expect(error4.toObject()).to.have.property("error_info");
    });

});
