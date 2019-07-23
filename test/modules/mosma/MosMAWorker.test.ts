/// <reference path="../../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import { PostgresConnector } from "../../../src/core/connectors";
import { MosMAWorker } from "../../../src/modules/mosma";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
const sinon = require("sinon");

chai.use(chaiAsPromised);

describe("MosMAWorker", () => {

    let worker;
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox({ useFakeTimers : true });
        sandbox.stub(PostgresConnector, "getConnection")
            .callsFake(() => Object.assign({define: sandbox.stub()}));

        worker = new MosMAWorker();
        sandbox.stub(worker.deviceModelTransformation, "transform")
            .callsFake(() => []);
        sandbox.stub(worker.ticketActivationsTransformation, "transform")
            .callsFake(() => []);
        sandbox.stub(worker.ticketInspectionsTransformation, "transform")
            .callsFake(() => []);
        sandbox.stub(worker.ticketPurchasesTransformation, "transform")
            .callsFake(() => []);
        sandbox.stub(worker.deviceModelModel, "save");
        sandbox.stub(worker.deviceModelModel, "truncate");
        sandbox.stub(worker.ticketActivationsModel, "save");
        sandbox.stub(worker.ticketInspectionsModel, "save");
        sandbox.stub(worker.ticketPurchasesModel, "save");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by saveDeviceModelsDataToDB method", async () => {
        await worker.saveDeviceModelsDataToDB({content: new Buffer(JSON.stringify([]))});
        sandbox.assert.calledOnce(worker.deviceModelTransformation.transform);
        sandbox.assert.calledOnce(worker.deviceModelModel.truncate);
        sandbox.assert.calledOnce(worker.deviceModelModel.save);
        sandbox.assert.callOrder(
            worker.deviceModelTransformation.transform,
            worker.deviceModelModel.truncate,
            worker.deviceModelModel.save);
        sandbox.assert.callCount(PostgresConnector.getConnection, 4);
    });

    it("should calls the correct methods by saveTicketActivationsDataToDB method", async () => {
        await worker.saveTicketActivationsDataToDB({content: new Buffer(JSON.stringify([]))});
        sandbox.assert.calledOnce(worker.ticketActivationsTransformation.transform);
        sandbox.assert.calledOnce(worker.ticketActivationsModel.save);
        sandbox.assert.callOrder(
            worker.ticketActivationsTransformation.transform,
            worker.ticketActivationsModel.save);
        sandbox.assert.callCount(PostgresConnector.getConnection, 4);
    });

    it("should calls the correct methods by saveTicketInspectionsDataToDB method", async () => {
        await worker.saveTicketInspectionsDataToDB({content: new Buffer(JSON.stringify([]))});
        sandbox.assert.calledOnce(worker.ticketInspectionsTransformation.transform);
        sandbox.assert.calledOnce(worker.ticketInspectionsModel.save);
        sandbox.assert.callOrder(
            worker.ticketInspectionsTransformation.transform,
            worker.ticketInspectionsModel.save);
        sandbox.assert.callCount(PostgresConnector.getConnection, 4);
    });

    it("should calls the correct methods by saveTicketPurchasesDataToDB method", async () => {
        await worker.saveTicketPurchasesDataToDB({content: new Buffer(JSON.stringify([]))});
        sandbox.assert.calledOnce(worker.ticketPurchasesTransformation.transform);
        sandbox.assert.calledOnce(worker.ticketPurchasesModel.save);
        sandbox.assert.callOrder(
            worker.ticketPurchasesTransformation.transform,
            worker.ticketPurchasesModel.save);
        sandbox.assert.callCount(PostgresConnector.getConnection, 4);
    });

});
