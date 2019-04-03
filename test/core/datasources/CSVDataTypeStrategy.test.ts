/// <reference path="../../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import { CSVDataTypeStrategy, ICSVSettings } from "../../../src/core/datasources";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

describe("CSVDataTypeStrategy", () => {

    let testSettings: ICSVSettings;
    let strategy;
    let testCSVString;

    beforeEach(() => {
        testSettings = { csvtojsonParams: { noheader: false }, subscribe: ((json: any) => json)};
        strategy = new CSVDataTypeStrategy(testSettings);
        testCSVString = "id,data\n1,test1\n2,test\n";
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
        const parsed = await strategy.parseData(testCSVString);
        expect(parsed[0]).to.have.property("id");
        expect(parsed[0]).to.have.property("data");
        expect(parsed[1]).to.have.property("id");
        expect(parsed[1]).to.have.property("data");
    });

    it("should properly set and use filter", async () => {
        strategy.setFilter((a) => a.data === "test1");
        const parsed = await strategy.parseData(testCSVString);
        expect(parsed.length).to.be.equal(1);
        expect(parsed[0].data).to.be.equal("test1");
    });

    it("should properly set data type settings", async () => {
        testSettings.subscribe = (json) => { json.content = json.data; delete json.data; return json; };
        strategy.setDataTypeSettings(testSettings);
        const parsed = await strategy.parseData(testCSVString);
        expect(parsed[0]).to.have.property("id");
        expect(parsed[0]).to.have.property("content");
        expect(parsed[1]).to.have.property("id");
        expect(parsed[1]).to.have.property("content");
    });

});
