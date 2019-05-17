/// <reference path="../../../node_modules/@types/node/index.d.ts" />

"use strict";

import { MunicipalAuthorities } from "golemio-schema-definitions";
import "mocha";
import { config } from "../../../src/core/config";
import { MunicipalAuthoritiesWorker } from "../../../src/modules/municipalauthorities";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
const sinon = require("sinon");

chai.use(chaiAsPromised);

describe("MunicipalAuthoritiesWorker", () => {

    let worker;
    let sandbox;
    let testData;
    let testTransformedData;
    let testQueuesData;
    let testQueuesTransformedData;
    let testQueuesTransformedHistoryData;
    let dataQueues1;
    let queuePrefix;

    beforeEach(() => {
        sandbox = sinon.createSandbox({ useFakeTimers : true });

        testData = [1, 2];
        testTransformedData = [1, 2];
        testQueuesData = [1, 2];
        testQueuesTransformedData = [1, 2];
        testQueuesTransformedHistoryData = [1, 2];
        dataQueues1 = {properties: {id: 1}, geometry: {coordinates: [1, 1]}, save: sandbox.stub().resolves(true)};

        worker = new MunicipalAuthoritiesWorker();

        sandbox.stub(worker.dataSource, "getAll")
            .callsFake(() => testData);
        sandbox.stub(worker.transformation, "transform")
            .callsFake(() => testTransformedData);
        sandbox.stub(worker.model, "save");

        sandbox.stub(worker.skodaPalaceQueuesDataSource, "getAll")
            .callsFake(() => testQueuesData);
        sandbox.stub(worker.skodaPalaceQueuesTransformation, "transform")
            .callsFake(() => testQueuesTransformedData);
        sandbox.stub(worker.skodaPalaceQueuesTransformation, "transformHistory")
            .callsFake(() => testQueuesTransformedHistoryData);
        sandbox.stub(worker.waitingQueuesModel, "save");
        sandbox.stub(worker.waitingQueuesHistoryModel, "save");
        sandbox.stub(worker.waitingQueuesHistoryModel, "aggregate")
            .callsFake(() => []);
        sandbox.stub(worker, "sendMessageToExchange");
        queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + MunicipalAuthorities.name.toLowerCase();
        sandbox.stub(worker.waitingQueuesModel, "findOneById")
            .callsFake(() => dataQueues1);
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by refreshDataInDB method", async () => {
        await worker.refreshDataInDB();
        sandbox.assert.calledOnce(worker.dataSource.getAll);
        sandbox.assert.calledOnce(worker.transformation.transform);
        sandbox.assert.calledWith(worker.transformation.transform, testData);
        sandbox.assert.calledOnce(worker.model.save);
        sandbox.assert.callOrder(
            worker.dataSource.getAll,
            worker.transformation.transform,
            worker.model.save);
    });

    it("should calls the correct methods by refreshWaitingQueues method", async () => {
        await worker.refreshWaitingQueues();
        sandbox.assert.calledOnce(worker.skodaPalaceQueuesDataSource.getAll);
        sandbox.assert.calledOnce(worker.skodaPalaceQueuesTransformation.transform);
        sandbox.assert.calledWith(worker.skodaPalaceQueuesTransformation.transform, testQueuesData);
        sandbox.assert.calledOnce(worker.waitingQueuesModel.save);
        sandbox.assert.calledWith(worker.waitingQueuesModel.save, testQueuesTransformedHistoryData);
        sandbox.assert.calledOnce(worker.sendMessageToExchange);
        sandbox.assert.calledWith(worker.sendMessageToExchange,
            "workers." + queuePrefix + ".saveWaitingQueuesDataToHistory",
            new Buffer(JSON.stringify(testQueuesTransformedData)));
        sandbox.assert.callOrder(
            worker.skodaPalaceQueuesDataSource.getAll,
            worker.skodaPalaceQueuesTransformation.transform,
            worker.waitingQueuesModel.save,
            worker.sendMessageToExchange);
    });

    it("should calls the correct methods by saveWaitingQueuesDataToHistory method", async () => {
        await worker.saveWaitingQueuesDataToHistory({content: new Buffer(JSON.stringify(testQueuesTransformedData))});
        sandbox.assert.calledOnce(worker.skodaPalaceQueuesTransformation.transformHistory);
        sandbox.assert.calledWith(worker.skodaPalaceQueuesTransformation.transformHistory, testTransformedData);
        sandbox.assert.calledOnce(worker.waitingQueuesHistoryModel.save);
        sandbox.assert.calledWith(worker.waitingQueuesHistoryModel.save, testQueuesTransformedHistoryData);
        sandbox.assert.callOrder(
            worker.skodaPalaceQueuesTransformation.transformHistory,
            worker.waitingQueuesHistoryModel.save,
        );
    });

});
