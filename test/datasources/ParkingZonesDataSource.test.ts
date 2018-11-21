/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import ParkingZonesDataSource from "../../src/datasources/ParkingZonesDataSource";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

describe("ParkingZonesDataSource", () => {

    let datasource;
    let parkingId;

    beforeEach(() => {
        datasource = new ParkingZonesDataSource();
        parkingId = "P8-1412";
    });

    it("should instantiate", () => {
        expect(datasource).not.to.be.undefined;
    });

    it("should has name", () => {
        expect(datasource.name).to.be.equal("ParkingZonesDataSource");
    });

    it("should has GetAll method", () => {
        expect(datasource.GetAll).not.to.be.undefined;
    });

    it("should get all parkingZones", async () => {
        const promise = datasource.GetAll();
        expect(Object.prototype.toString.call(promise)).to.equal("[object Promise]");
        expect(promise).to.be.fulfilled;
    });

    it("should returns all parkingZones", async () => {
        const data = await datasource.GetAll();
        expect(data).to.be.an.instanceOf(Object);
    });

    it("should has GetOne method", () => {
        expect(datasource.GetOne).not.to.be.undefined;
    });

    it("should get one parkingZone by id", async () => {
        const promise = datasource.GetOne(parkingId);
        expect(Object.prototype.toString.call(promise)).to.equal("[object Promise]");
        expect(promise).to.be.fulfilled;
    });

    it("should returns one parkingZone by id", async () => {
        const data = await datasource.GetOne(parkingId);
        expect(data).to.be.an.instanceOf(Object);
    });

    it("should property throws error if one parkingZone by id was not found", async () => {
        const promise = datasource.GetOne(2);
        expect(Object.prototype.toString.call(promise)).to.equal("[object Promise]");
        expect(promise).to.be.rejected;
    });

});
