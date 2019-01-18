/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import RopidGTFSDataSource from "../../src/datasources/RopidGTFSDataSource";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

const config = require("../../src/config/ConfigLoader");

describe("RopidGTFSDataSource", () => {

    let datasource;

    beforeEach(() => {
        datasource = new RopidGTFSDataSource();
    });

    it("should instantiate", () => {
        expect(datasource).not.to.be.undefined;
    });

    it("should has correct Ropid FTP", () => {
        expect(config.datasources.RopidFTP.host).to.not.equal("");
    });

    it("should has GetAll method", () => {
        expect(datasource.GetAll).not.to.be.undefined;
    });

    it("should has getLastModified method", () => {
        expect(datasource.getLastModified).not.to.be.undefined;
    });

    it("should get all files from Ropid FTP", async () => {
        const promise = datasource.GetAll();
        expect(Object.prototype.toString.call(promise)).to.equal("[object Promise]");
        expect(promise).to.be.fulfilled;
    });

    it("should returns all files from Ropid FTP", async () => {
        const data = await datasource.GetAll();
        expect(data).to.be.an.instanceOf(Object);
        expect(data).to.have.property("files");
        expect(data).to.have.property("last_modified");
    });

    it("should returns last modified of the all files from Ropid FTP", async () => {
        const data = await datasource.getLastModified();
        expect(data).to.be.a("string");
        const date = new Date(data);
        expect(new Date(data)).to.be.an.instanceOf(Date);
        expect(data).to.equal(date.toISOString());
    });

});
