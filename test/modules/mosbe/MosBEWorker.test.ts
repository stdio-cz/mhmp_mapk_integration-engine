/// <reference path="../../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import { PostgresConnector } from "../../../src/core/connectors";
import { MosBEWorker } from "../../../src/modules/mosbe";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
const sinon = require("sinon");

chai.use(chaiAsPromised);

describe("MosBEWorker", () => {

    let worker;
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox({ useFakeTimers : true });
        sandbox.stub(PostgresConnector, "getConnection")
            .callsFake(() => Object.assign({define: sandbox.stub()}));

        worker = new MosBEWorker();
        sandbox.stub(worker.accountsTransformation, "transform")
            .callsFake(() => []);
        sandbox.stub(worker.couponsTransformation, "transform")
            .callsFake(() => []);
        sandbox.stub(worker.customersTransformation, "transform")
            .callsFake(() => []);
        sandbox.stub(worker.zonesTransformation, "transform")
            .callsFake(() => []);
        sandbox.stub(worker.accountsModel, "save");
        sandbox.stub(worker.couponsModel, "save");
        sandbox.stub(worker.customersModel, "save");
        sandbox.stub(worker.zonesModel, "save");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by saveAccountsDataToDB method", async () => {
        await worker.saveAccountsDataToDB({content: new Buffer(JSON.stringify([]))});
        sandbox.assert.calledOnce(worker.accountsTransformation.transform);
        sandbox.assert.calledOnce(worker.accountsModel.save);
        sandbox.assert.callOrder(
            worker.accountsTransformation.transform,
            worker.accountsModel.save);
        sandbox.assert.callCount(PostgresConnector.getConnection, 4);
    });

    it("should calls the correct methods by saveCouponsDataToDB method", async () => {
        await worker.saveCouponsDataToDB({content: new Buffer(JSON.stringify([]))});
        sandbox.assert.calledOnce(worker.couponsTransformation.transform);
        sandbox.assert.calledOnce(worker.couponsModel.save);
        sandbox.assert.callOrder(
            worker.couponsTransformation.transform,
            worker.couponsModel.save);
        sandbox.assert.callCount(PostgresConnector.getConnection, 4);
    });

    it("should calls the correct methods by saveCustomersDataToDB method", async () => {
        await worker.saveCustomersDataToDB({content: new Buffer(JSON.stringify([]))});
        sandbox.assert.calledOnce(worker.customersTransformation.transform);
        sandbox.assert.calledOnce(worker.customersModel.save);
        sandbox.assert.callOrder(
            worker.customersTransformation.transform,
            worker.customersModel.save);
        sandbox.assert.callCount(PostgresConnector.getConnection, 4);
    });

    it("should calls the correct methods by saveZonesDataToDB method", async () => {
        await worker.saveZonesDataToDB({content: new Buffer(JSON.stringify([]))});
        sandbox.assert.calledOnce(worker.zonesTransformation.transform);
        sandbox.assert.calledOnce(worker.zonesModel.save);
        sandbox.assert.callOrder(
            worker.zonesTransformation.transform,
            worker.zonesModel.save);
        sandbox.assert.callCount(PostgresConnector.getConnection, 4);
    });

});
