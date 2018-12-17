/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import { Parkings } from "data-platform-schema-definitions";
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
        validator = new Validator(Parkings.history.name, Parkings.history.outputMongooseSchemaObject);
        testData = [{
            id : 534001,
            num_of_free_places : 91,
            num_of_taken_places : 1,
            timestamp : 1545063078063,
            total_num_of_places : 92,
        },
        {
            id : 534015,
            num_of_free_places : 43,
            num_of_taken_places : 126,
            timestamp : 1545063078065,
            total_num_of_places : 169,
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
