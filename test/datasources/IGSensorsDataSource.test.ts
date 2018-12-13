/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import IGSensorsDataSource from "../../src/datasources/IGSensorsDataSource";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

const config = require("../../src/config/ConfigLoader");

describe("IGSensorsDataSource", () => {

    let datasource;
    let lampId;

    beforeEach(() => {
        datasource = new IGSensorsDataSource();
        lampId = "ICE-003-042-000-006";
    });

    it("should instantiate", () => {
        expect(datasource).not.to.be.undefined;
    });

    it("should has correct IGToken", () => {
        expect(config.datasources.IGToken).to.not.equal("myStringToken");
    });

    it("should has GetAll method", () => {
        expect(datasource.GetAll).not.to.be.undefined;
    });

    it("should get all ICE Gateways", async () => {
        const promise = datasource.GetAll();
        expect(Object.prototype.toString.call(promise)).to.equal("[object Promise]");
        expect(promise).to.be.fulfilled;
    });

    it("should returns all ICE Gateways", async () => {
        const data = await datasource.GetAll();
        expect(data).to.be.an.instanceOf(Object);
    });

    it("should has GetOne method", () => {
        expect(datasource.GetOne).not.to.be.undefined;
    });

    it("should get one ICE Gateway by id", async () => {
        const promise = datasource.GetOne(lampId);
        expect(Object.prototype.toString.call(promise)).to.equal("[object Promise]");
        expect(promise).to.be.fulfilled;
    });

    it("should returns one ICE Gateway by id", async () => {
        const data = await datasource.GetOne(lampId);
        expect(data).to.be.an.instanceOf(Object);
    });

});
