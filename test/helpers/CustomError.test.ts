/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import CustomError from "../../src/helpers/errors/CustomError";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

const config = require("../../src/config/ConfigLoader");

describe("CustomError", () => {

    let error1: CustomError;
    let error2: CustomError;
    let error3: CustomError;
    let error4: CustomError;
    let error5: CustomError;
    let tmpNodeEnv;

    before(() => {
        tmpNodeEnv = config.NODE_ENV;
        config.NODE_ENV = "test";
    });

    after(() => {
        config.NODE_ENV = tmpNodeEnv;
    });

    beforeEach(() => {
        error1 = new CustomError("Test error");
        error2 = new CustomError("Test error", true);
        error3 = new CustomError("Test error", true, "TestError");
        error4 = new CustomError("Test error", true, "TestError", 4);
        error5 = new CustomError("Test error", true, "TestError", 5, "Additional info");
    });

    it("should properly returns error description as string", async () => {
        expect(error1.toString()).to.be.equal("Test error");
        expect(error2.toString()).to.be.equal("Test error");
        expect(error3.toString()).to.be.equal("\"TestError\" Test error");
        expect(error4.toString()).to.be.equal("\"TestError\" [4] Test error");
        expect(error5.toString()).to.be.equal("\"TestError\" [5] Test error (Additional info)");
    });

    it("should properly returns error description as object", async () => {
        expect(error1.toObject()).to.have.property("error_message");
        expect(error2.toObject()).to.have.property("error_message");
        expect(error3.toObject()).to.have.property("error_message");
        expect(error3.toObject()).to.have.property("error_class_name");
        expect(error4.toObject()).to.have.property("error_message");
        expect(error4.toObject()).to.have.property("error_class_name");
        expect(error4.toObject()).to.have.property("error_code");
        expect(error5.toObject()).to.have.property("error_message");
        expect(error5.toObject()).to.have.property("error_class_name");
        expect(error5.toObject()).to.have.property("error_code");
        expect(error5.toObject()).to.have.property("error_info");
    });

});
