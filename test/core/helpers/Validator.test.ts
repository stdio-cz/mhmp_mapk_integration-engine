/// <reference path="../../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import { SchemaDefinition } from "mongoose";
import { Validator } from "../../../src/core/helpers";
import { CustomError } from "../../../src/core/helpers/errors";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

describe("Validator", () => {

    let validator: Validator;
    let testMSO: SchemaDefinition;
    let testData: object;

    beforeEach(() => {
        testMSO = {
            id: { type: Number, required: true },
            num_of_free_places: { type: Number, required: true },
            num_of_taken_places: { type: Number, required: true },
            timestamp: { type: Number, required: true },
            total_num_of_places: { type: Number, required: true },
        };
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
        validator = new Validator("Test", testMSO);
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
