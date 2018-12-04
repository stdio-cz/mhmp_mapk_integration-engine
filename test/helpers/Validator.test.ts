/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import { CityDistricts } from "data-platform-schema-definitions";
import "mocha";
import CustomError from "../../src/helpers/errors/CustomError";
import Validator from "../../src/helpers/Validator";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

describe("Validator", () => {

    let validator: Validator;
    let testData: object;

    beforeEach(() => {
        validator = new Validator("CityDistricts", CityDistricts.outputMongooseSchemaObject);
        testData = [{
            id: 547310,
            name: "Praha-Čakovice",
            slug: "praha-cakovice",
            timestamp: 111111111,
        }, {
            id: 539791,
            name: "Praha-Újezd",
            slug: "praha-ujezd",
            timestamp: 111111111,
        }];
    });

    it("should has Validate method", async () => {
        expect(validator.Validate).not.to.be.undefined;
    });

    it("should should properly validates the valid data", async () => {
        await expect(validator.Validate(testData)).to.be.fulfilled;
    });

    it("should throw error if the data are not valid", async () => {
        delete testData[1].timestamp;
        await expect(validator.Validate(testData)).to.be.rejectedWith(CustomError);
    });

});
