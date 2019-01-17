/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import ParkingZonesTariffsDataSource from "../../src/datasources/ParkingZonesTariffsDataSource";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

describe("ParkingZonesTariffsDataSource", () => {

    let datasource;

    beforeEach(() => {
        datasource = new ParkingZonesTariffsDataSource();
    });

    it("should instantiate", () => {
        expect(datasource).not.to.be.undefined;
    });

    it("should has name", () => {
        expect(datasource.name).to.be.equal("ParkingZonesTariffsDataSource");
    });

    it("should has GetAll method", () => {
        expect(datasource.GetAll).not.to.be.undefined;
    });

    it("should get all tariffs", async () => {
        const promise = datasource.GetAll();
        expect(Object.prototype.toString.call(promise)).to.equal("[object Promise]");
        expect(promise).to.be.fulfilled;
    });

    it("should returns all tariffs", async () => {
        const data = await datasource.GetAll();
        expect(data).to.be.an.instanceOf(Object);
    });

});
