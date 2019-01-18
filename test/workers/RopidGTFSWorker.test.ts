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
const { PostgresConnector } = require("../../src/helpers/PostgresConnector");

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

        testData = {
            files: [{data: 1, filepath: 11}, {data: 2, filepath: 22}],
            last_modified: "2019-01-18T03:22:09.000Z",
        };
        testTransformedData = {data: [1], filepath: 11, name: "fake"};

        sandbox.stub(PostgresConnector, "getConnection")
            .callsFake(() => Object.assign({define: sandbox.stub()}));

        worker = new RopidGTFSWorker();

        sandbox.stub(worker.dataSource, "getLastModified")
            .callsFake(() => "2019-01-18T03:22:09.000Z");
        sandbox.stub(worker.dataSource, "GetAll")
            .callsFake(() => testData);

        sandbox.stub(worker.metaModel, "getLastModified")
            .callsFake(() => "2019-01-18T03:24:09.000Z");
        sandbox.stub(worker.metaModel, "SaveToDb");
        sandbox.stub(worker.metaModel, "checkSavedRowsAndReplaceTables")
            .callsFake(() => true);

        sandbox.stub(worker.transformation, "TransformDataElement")
            .callsFake(() => testTransformedData);

        sandbox.stub(worker, "sendMessageToExchange");
        queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + RopidGTFS.name.toLowerCase();
        sandbox.stub(worker, "readFile")
            .callsFake(() => testData.files[0].data);
        modelTruncateStub = sandbox.stub();
        modelSaveStub = sandbox.stub();
        sandbox.stub(worker, "getModelByName")
            .callsFake(() => Object.assign({Truncate: modelTruncateStub, SaveToDb: modelSaveStub}));
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by checkForNewData method", async () => {
        await worker.checkForNewData();
        sandbox.assert.calledOnce(worker.dataSource.getLastModified);
        sandbox.assert.calledOnce(worker.metaModel.getLastModified);
        sandbox.assert.calledOnce(worker.sendMessageToExchange);
        sandbox.assert.callOrder(
            worker.dataSource.getLastModified,
            worker.metaModel.getLastModified,
            worker.sendMessageToExchange);
    });

    it("should calls the correct methods by downloadFiles method", async () => {
        await worker.downloadFiles();
        sandbox.assert.calledOnce(worker.dataSource.GetAll);
        sandbox.assert.calledOnce(worker.metaModel.SaveToDb);
        sandbox.assert.callCount(worker.sendMessageToExchange, 3);
        testData.files.map((f) => {
            sandbox.assert.calledWith(worker.sendMessageToExchange,
                "workers." + queuePrefix + ".transformData",
                new Buffer(JSON.stringify(f)));
        });
        sandbox.assert.calledWith(worker.sendMessageToExchange,
            "workers." + queuePrefix + ".checkingIfDone",
            new Buffer(JSON.stringify({count: testData.files.length})));
        sandbox.assert.callOrder(
            worker.dataSource.GetAll,
            worker.metaModel.SaveToDb,
            worker.sendMessageToExchange);
    });

    it("should calls the correct methods by transformData method", async () => {
        await worker.transformData(testData.files[0]);
        sandbox.assert.calledOnce(worker.readFile);
        sandbox.assert.calledOnce(worker.transformation.TransformDataElement);
        sandbox.assert.calledWith(worker.transformation.TransformDataElement, testData.files[0]);
        sandbox.assert.calledOnce(worker.getModelByName);
        sandbox.assert.calledWith(worker.getModelByName, testTransformedData.name);
        sandbox.assert.calledOnce(modelTruncateStub);
        sandbox.assert.calledOnce(worker.metaModel.SaveToDb);
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

    it("should calls the correct methods by checkSavedRowsAndReplaceTables method", async () => {
        await worker.checkSavedRowsAndReplaceTables();
        sandbox.assert.calledOnce(worker.metaModel.checkSavedRowsAndReplaceTables);
    });

});
