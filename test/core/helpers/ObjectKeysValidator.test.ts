/// <reference path="../../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import { SchemaDefinition } from "mongoose";
import { ObjectKeysValidator } from "../../../src/core/helpers";
import { CustomError } from "../../../src/core/helpers/errors";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

describe("ObjectKeysValidator", () => {

    let validator: ObjectKeysValidator;
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
        testData = {
            // single item
            key1: {
                id: 534001,
                num_of_free_places: 91,
                num_of_taken_places: 1,
                timestamp: 1545063078063,
                total_num_of_places: 92,
            },
            // array of items
            key2: [
                {
                    id: 534001,
                    num_of_free_places: 91,
                    num_of_taken_places: 1,
                    timestamp: 1545063078063,
                    total_num_of_places: 92,
                },
                {
                    id: 534015,
                    num_of_free_places: 43,
                    num_of_taken_places: 126,
                    timestamp: 1545063078065,
                    total_num_of_places: 169,
                },
            ],
        };
        validator = new ObjectKeysValidator("Test", testMSO);
    });

    it("should has Validate method", async () => {
        expect(validator.Validate).not.to.be.undefined;
    });

    it("should properly validate the valid data", async () => {
        await expect(validator.Validate(testData)).to.be.fulfilled;
    });

    it("should validate empty data", async () => {
        await expect(validator.Validate({})).to.be.fulfilled;
    });

    it("should throw error if the data is null", async () => {
        await expect(validator.Validate(null)).to.be.rejectedWith(CustomError);
    });

    it("should throw error if the data is undefined", async () => {
        await expect(validator.Validate(undefined)).to.be.rejectedWith(CustomError);
    });

    it("should throw error if the data of single item are not valid", async () => {
        delete (testData as any).key1.timestamp;
        await expect(validator.Validate(testData)).to.be.rejectedWith(CustomError);
    });

    it("should throw error if the data of array item are not valid", async () => {
        delete (testData as any).key2[0].timestamp;
        await expect(validator.Validate(testData)).to.be.rejectedWith(CustomError);
    });
});
