/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import TSKParkingsDataSource from "../../src/datasources/TSKParkingsDataSource";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

describe("TSKParkingsDataSource", () => {

    let datasource;
    let parkingId;

    beforeEach(() => {
        datasource = new TSKParkingsDataSource();
        parkingId = 534016;
    });

    it("should instantiate", () => {
        expect(datasource).not.to.be.undefined;
    });

    it("should has GetAll method", () => {
        expect(datasource.GetAll).not.to.be.undefined;
    });

    it("should get all parkings", async () => {
        const promise = datasource.GetAll();
        expect(Object.prototype.toString.call(promise)).to.equal("[object Promise]");
        expect(promise).to.be.fulfilled;
    });

    it("should returns all parkings", async () => {
        const data = await datasource.GetAll();
        expect(data).to.be.an.instanceOf(Object);
    });

    it("should has GetOne method", () => {
        expect(datasource.GetOne).not.to.be.undefined;
    });

    it("should get one parking by id", async () => {
        const promise = datasource.GetOne(parkingId);
        expect(Object.prototype.toString.call(promise)).to.equal("[object Promise]");
        expect(promise).to.be.fulfilled;
    });

    it("should returns one parking by id", async () => {
        const data = await datasource.GetOne(parkingId);
        expect(data).to.be.an.instanceOf(Object);
    });

});
