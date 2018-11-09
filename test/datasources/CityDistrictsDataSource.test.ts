/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import CityDistrictsDataSource from "../../src/datasources/CityDistrictsDataSource";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

describe("CityDistrictsDataSource", () => {

    let datasource;
    let districtId;
    let districtSlug;

    beforeEach(() => {
        datasource = new CityDistrictsDataSource();
        districtId = 500054;
        districtSlug = "praha-1";
    });

    it("should instantiate", () => {
        expect(datasource).not.to.be.undefined;
    });

    it("should has GetAll method", () => {
        expect(datasource.GetAll).not.to.be.undefined;
    });

    it("should get all city districts", async () => {
        const promise = datasource.GetAll();
        expect(Object.prototype.toString.call(promise)).to.equal("[object Promise]");
        expect(promise).to.be.fulfilled;
    });

    it("should returns all city districts", async () => {
        const data = await datasource.GetAll();
        expect(data).to.be.an.instanceOf(Object);
    });

    it("should has GetOne method", () => {
        expect(datasource.GetOne).not.to.be.undefined;
    });

    it("should get one city district by id", async () => {
        const promise = datasource.GetOne(districtId);
        expect(Object.prototype.toString.call(promise)).to.equal("[object Promise]");
        expect(promise).to.be.fulfilled;
    });

    it("should returns one city district by id", async () => {
        const data = await datasource.GetOne(districtId);
        expect(data).to.be.an.instanceOf(Object);
    });

    it("should get one city district by slug", async () => {
        const promise = datasource.GetOne(districtSlug);
        expect(Object.prototype.toString.call(promise)).to.equal("[object Promise]");
        expect(promise).to.be.fulfilled;
    });

    it("should returns one city district by slug", async () => {
        const data = await datasource.GetOne(districtSlug);
        expect(data).to.be.an.instanceOf(Object);
    });

});
