/// <reference path="../../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import { IJSONSettings, JSONDataTypeStrategy } from "../../../src/core/datasources";
import { CustomError } from "@golemio/errors";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

describe("JSONDataTypeStrategy", () => {

    let testSettings: IJSONSettings;
    let strategy;
    let testJSONString;

    beforeEach(() => {
        testSettings = { resultsPath: "" };
        strategy = new JSONDataTypeStrategy(testSettings);
        testJSONString = '{"message": "test", "data": ["test1", "test2"]}';
    });

    it("should has parseData method", () => {
        expect(strategy.parseData).not.to.be.undefined;
    });

    it("should has setDataTypeSettings method", () => {
        expect(strategy.setDataTypeSettings).not.to.be.undefined;
    });

    it("should has setFilter method", () => {
        expect(strategy.setFilter).not.to.be.undefined;
    });

    it("should has parseData method", () => {
        expect(strategy.parseData).not.to.be.undefined;
    });

    it("should properly parse string data", async () => {
        const parsed = await strategy.parseData(testJSONString);
        expect(parsed).to.have.property("message");
        expect(parsed).to.have.property("data");
    });

    it("should properly parse data with specified resultsPath", async () => {
        testSettings.resultsPath = "data";
        strategy.setDataTypeSettings(testSettings);
        const parsed = await strategy.parseData(testJSONString);
        expect(parsed.length).to.be.equal(2);
    });

    it("should properly parse object data", async () => {
        const parsed = await strategy.parseData(JSON.parse(testJSONString));
        expect(parsed).to.have.property("message");
        expect(parsed).to.have.property("data");
    });

    it("should properly set and use filter", async () => {
        testSettings.resultsPath = "data";
        strategy.setDataTypeSettings(testSettings);
        strategy.setFilter((a) => a === "test1");
        const parsed = await strategy.parseData(testJSONString);
        expect(parsed.length).to.be.equal(1);
        expect(parsed[0]).to.be.equal("test1");
    });

    it("should throw error if JSON is not valid", async () => {
        await expect(strategy.parseData('{"message": }')).to.be.rejectedWith(CustomError);
    });

    it("should properly set data type settings", async () => {
        testSettings.resultsPath = "data";
        strategy.setDataTypeSettings(testSettings);
        expect(strategy.resultsPath).to.be.equal("data");
    });

});
