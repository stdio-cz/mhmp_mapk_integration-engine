/// <reference path="../../../node_modules/@types/node/index.d.ts" />

"use strict";

import { CustomError } from "@golemio/errors";
import "mocha";
import { DataSource } from "../../../src/core/datasources";
import { log } from "../../../src/core/helpers/Logger";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
const sinon = require("sinon");

chai.use(chaiAsPromised);

describe("DataSource", () => {

    let sandbox;
    let datasource;
    let protocolStub;
    let dataTypeStub;
    let validatorStub;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        protocolStub = {
            getData: sandbox.stub().callsFake(() => '{"message": "test"}'),
            getLastModified: sandbox.stub(),
        };
        dataTypeStub = {
            parseData: sandbox.stub().callsFake(() => Object.assign({message: "test"})),
        };
        validatorStub = {
            Validate: sandbox.stub().callsFake(() => true),
        };
        sandbox.spy(log, "warn");

        datasource = new DataSource("TestDataSource",
            protocolStub,
            dataTypeStub,
            validatorStub);
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should has name method", () => {
        expect(datasource.name).not.to.be.undefined;
    });

    it("should has getAll method", () => {
        expect(datasource.getAll).not.to.be.undefined;
    });

    it("should has getLastModified method", () => {
        expect(datasource.getLastModified).not.to.be.undefined;
    });

    it("should has setProtocolStrategy method", () => {
        expect(datasource.setProtocolStrategy).not.to.be.undefined;
    });

    it("should has setDataTypeStrategy method", () => {
        expect(datasource.setDataTypeStrategy).not.to.be.undefined;
    });

    it("should has setValidator method", () => {
        expect(datasource.setValidator).not.to.be.undefined;
    });

    it("should properly get all data", async () => {
        const data = await datasource.getAll();
        expect(data).to.have.property("message");
    });

    it("should throws error if data are not valid", async () => {
        validatorStub.Validate = sandbox.stub().throws();
        datasource.setValidator(validatorStub);
        await expect(datasource.getAll()).to.be.rejectedWith(CustomError);
    });

    it("should warn if data are empty", async () => {
        dataTypeStub.parseData = sandbox.stub().callsFake(() => []),
        datasource.setDataTypeStrategy(dataTypeStub);
        await datasource.getAll();
        dataTypeStub.parseData = sandbox.stub().callsFake(() => null),
        datasource.setDataTypeStrategy(dataTypeStub);
        await datasource.getAll();
        dataTypeStub.parseData = sandbox.stub().callsFake(() => Object.assign({})),
        datasource.setDataTypeStrategy(dataTypeStub);
        await datasource.getAll();
        sandbox.assert.calledThrice(log.warn);
    });

    it("should warn if validator is not set", async () => {
        datasource.setValidator(null);
        await datasource.getAll();
        sandbox.assert.calledOnce(log.warn);
    });

    it("should properly get last modified", async () => {
        const lastMod = await datasource.getLastModified();
        sandbox.assert.calledOnce(protocolStub.getLastModified);
    });

    it("should set protocol strategy", async () => {
        datasource.setProtocolStrategy(null);
        expect(datasource.protocolStrategy).to.be.null;
    });

    it("should set datatype strategy", async () => {
        datasource.setDataTypeStrategy(null);
        expect(datasource.dataTypeStrategy).to.be.null;
    });

    it("should set validator", async () => {
        datasource.setValidator(null);
        expect(datasource.validator).to.be.null;
    });

});
