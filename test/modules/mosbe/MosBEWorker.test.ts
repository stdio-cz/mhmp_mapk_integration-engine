"use strict";

import "mocha";
import * as sinon from "sinon";
import { PostgresConnector } from "../../../src/core/connectors";
import { MosBEWorker } from "../../../src/modules/mosbe";

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
        sandbox.stub(worker.accountsModel, "saveBySqlFunction");
        sandbox.stub(worker.couponsModel, "saveBySqlFunction");
        sandbox.stub(worker.customersModel, "saveBySqlFunction");
        sandbox.stub(worker.zonesModel, "saveBySqlFunction");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by saveAccountsDataToDB method", async () => {
        await worker.saveAccountsDataToDB({content: Buffer.from(JSON.stringify([]))});
        sandbox.assert.calledOnce(worker.accountsTransformation.transform);
        sandbox.assert.calledOnce(worker.accountsModel.saveBySqlFunction);
        sandbox.assert.callOrder(
            worker.accountsTransformation.transform,
            worker.accountsModel.saveBySqlFunction);
        sandbox.assert.callCount(PostgresConnector.getConnection, 4);
    });

    it("should calls the correct methods by saveCouponsDataToDB method", async () => {
        await worker.saveCouponsDataToDB({content: Buffer.from(JSON.stringify([]))});
        sandbox.assert.calledOnce(worker.couponsTransformation.transform);
        sandbox.assert.calledOnce(worker.couponsModel.saveBySqlFunction);
        sandbox.assert.callOrder(
            worker.couponsTransformation.transform,
            worker.couponsModel.saveBySqlFunction);
        sandbox.assert.callCount(PostgresConnector.getConnection, 4);
    });

    it("should calls the correct methods by saveCustomersDataToDB method", async () => {
        await worker.saveCustomersDataToDB({content: Buffer.from(JSON.stringify([]))});
        sandbox.assert.calledOnce(worker.customersTransformation.transform);
        sandbox.assert.calledOnce(worker.customersModel.saveBySqlFunction);
        sandbox.assert.callOrder(
            worker.customersTransformation.transform,
            worker.customersModel.saveBySqlFunction);
        sandbox.assert.callCount(PostgresConnector.getConnection, 4);
    });

    it("should calls the correct methods by saveZonesDataToDB method", async () => {
        await worker.saveZonesDataToDB({content: Buffer.from(JSON.stringify([]))});
        sandbox.assert.calledOnce(worker.zonesTransformation.transform);
        sandbox.assert.calledOnce(worker.zonesModel.saveBySqlFunction);
        sandbox.assert.callOrder(
            worker.zonesTransformation.transform,
            worker.zonesModel.saveBySqlFunction);
        sandbox.assert.callCount(PostgresConnector.getConnection, 4);
    });

});
