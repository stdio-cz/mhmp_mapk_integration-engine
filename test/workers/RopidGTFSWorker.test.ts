/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import { RopidGTFS } from "data-platform-schema-definitions";
import "mocha";
import RopidGTFSWorker from "../../src/workers/RopidGTFSWorker";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
const sinon = require("sinon");

chai.use(chaiAsPromised);

const config = require("../../src/config/ConfigLoader");

describe("RopidGTFSWorker", () => {

    let worker;
    let sandbox;
    let queuePrefix;
    let testData;
    let testTransformedData;
    let modelTruncateStub;
    let modelSaveStub;

    beforeEach(() => {
        sandbox = sinon.createSandbox({ useFakeTimers : true });

        testData = [{data: 1, filepath: 11}, {data: 2, filepath: 22}];
        testTransformedData = {data: [1], filepath: 11, name: "fake"};

        worker = new RopidGTFSWorker();

        sandbox.stub(worker.dataSource, "GetAll")
            .callsFake(() => testData);
        sandbox.stub(worker.transformation, "TransformDataElement")
            .callsFake(() => testTransformedData);
        sandbox.stub(worker, "sendMessageToExchange");
        queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + RopidGTFS.name.toLowerCase();

        sandbox.stub(worker, "readFile")
            .callsFake(() => testData[0].data);
        modelTruncateStub = sandbox.stub();
        modelSaveStub = sandbox.stub();
        sandbox.stub(worker, "getModelByName")
            .callsFake(() => Object.assign({Truncate: modelTruncateStub, SaveToDb: modelSaveStub}));
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by downloadFiles method", async () => {
        await worker.downloadFiles();
        sandbox.assert.calledOnce(worker.dataSource.GetAll);
        sandbox.assert.callCount(worker.sendMessageToExchange, 3);
        testData.map((f) => {
            sandbox.assert.calledWith(worker.sendMessageToExchange,
                "workers." + queuePrefix + ".transformData",
                new Buffer(JSON.stringify(f)));
        });
        sandbox.assert.calledWith(worker.sendMessageToExchange,
            "workers." + queuePrefix + ".checkingIfDone",
            new Buffer(JSON.stringify({count: testData.length})));
        sandbox.assert.callOrder(
            worker.dataSource.GetAll,
            worker.sendMessageToExchange);
    });

    it("should calls the correct methods by transformData method", async () => {
        await worker.transformData(testData[0]);
        sandbox.assert.calledOnce(worker.readFile);
        sandbox.assert.calledOnce(worker.transformation.TransformDataElement);
        sandbox.assert.calledWith(worker.transformation.TransformDataElement, testData[0]);
        sandbox.assert.calledOnce(worker.getModelByName);
        sandbox.assert.calledWith(worker.getModelByName, testTransformedData.name);
        sandbox.assert.calledOnce(modelTruncateStub);
        testTransformedData.data.map((f) => {
            sandbox.assert.calledWith(worker.sendMessageToExchange,
                "workers." + queuePrefix + ".saveDataToDB",
                new Buffer(JSON.stringify({
                    data: f,
                    name: testTransformedData.name,
                })));
        });
    });

    it("should calls the correct methods by saveDataToDB method", async () => {
        await worker.saveDataToDB(testTransformedData);
        sandbox.assert.calledOnce(worker.getModelByName);
        sandbox.assert.calledWith(worker.getModelByName, testTransformedData.name);
        sandbox.assert.calledOnce(modelSaveStub);
        sandbox.assert.calledWith(modelSaveStub, testTransformedData.data);
    });

});
