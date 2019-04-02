/// <reference path="../../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import { IXMLSettings, XMLDataTypeStrategy } from "../../../src/core/datasources";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

describe("XMLDataTypeStrategy", () => {

    let testSettings: IXMLSettings;
    let strategy;
    let testXMLstring;

    beforeEach(() => {
        testSettings = { resultsPath: "", xml2jsParams: { explicitArray: false, trim: true } };
        strategy = new XMLDataTypeStrategy(testSettings);
        testXMLstring = '<a id="1"><message>test</message><data>test1</data><data>test2</data></a>';
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
        const parsed = await strategy.parseData(testXMLstring);
        expect(parsed).to.have.property("a");
        expect(parsed.a).to.have.property("$");
        expect(parsed.a).to.have.property("message");
        expect(parsed.a).to.have.property("data");
    });

    it("should properly parse data with specified resultsPath", async () => {
        testSettings.resultsPath = "a.data";
        strategy.setDataTypeSettings(testSettings);
        const parsed = await strategy.parseData(testXMLstring);
        expect(parsed.length).to.be.equal(2);
    });

    it("should properly set and use filter", async () => {
        testSettings.resultsPath = "a.data";
        strategy.setDataTypeSettings(testSettings);
        strategy.setFilter((a) => a === "test1");
        const parsed = await strategy.parseData(testXMLstring);
        expect(parsed.length).to.be.equal(1);
        expect(parsed[0]).to.be.equal("test1");
    });

    it("should throw error if XML is not valid", async () => {
        expect(strategy.parseData('<a id="1"><message>test</mess></a>')).to.be.rejected;
    });

    it("should properly set data type settings", async () => {
        testSettings.resultsPath = "a.data";
        strategy.setDataTypeSettings(testSettings);
        expect(strategy.dataTypeSettings.resultsPath).to.be.equal("a.data");
    });
});
