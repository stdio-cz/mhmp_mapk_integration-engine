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
    let testDataCis;
    let testTransformedDataCis;
    let modelTruncateStub;
    let modelSaveStub;

    beforeEach(() => {
        sandbox = sinon.createSandbox({ useFakeTimers : true });

        testData = [{data: 1, filepath: 11}, {data: 2, filepath: 22}];
        testTransformedData = {data: [1], filepath: 11, name: "fake"};
        testDataCis = [];
        testTransformedDataCis = {cis_stop_groups: [1], cis_stops: [2]};

        sandbox.stub(PostgresConnector, "getConnection")
            .callsFake(() => Object.assign({define: sandbox.stub()}));

        worker = new RopidGTFSWorker();

        sandbox.stub(worker.dataSource, "getLastModified")
            .callsFake(() => "2019-01-18T03:22:09.000Z");
        sandbox.stub(worker.dataSource, "getAll")
            .callsFake(() => testData);

        sandbox.stub(worker.metaModel, "getLastModified")
            .callsFake(() => Object.assign({lastModified: "2019-01-18T03:24:09.000Z", version: 0}));
        sandbox.stub(worker.metaModel, "save");
        sandbox.stub(worker.metaModel, "checkSavedRowsAndReplaceTables")
            .callsFake(() => true);

        sandbox.stub(worker.transformation, "TransformDataElement")
            .callsFake(() => testTransformedData);

        sandbox.stub(worker, "sendMessageToExchange");
        queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + RopidGTFS.name.toLowerCase();
        sandbox.stub(worker, "readFile")
            .callsFake(() => testData[0].data);
        modelTruncateStub = sandbox.stub();
        modelSaveStub = sandbox.stub();
        sandbox.stub(worker, "getModelByName")
            .callsFake(() => Object.assign({truncate: modelTruncateStub, save: modelSaveStub}));

        sandbox.stub(worker.dataSourceCisStops, "getAll")
            .callsFake(() => testDataCis);
        sandbox.stub(worker.dataSourceCisStops, "getLastModified")
            .callsFake(() => Object.assign({lastModified: "2019-01-18T03:24:09.000Z", version: 0}));
        sandbox.stub(worker.transformationCisStops, "TransformDataCollection")
            .callsFake(() => testTransformedDataCis);
        sandbox.stub(worker.cisStopGroupsModel, "truncate");
        sandbox.stub(worker.cisStopGroupsModel, "save");
        sandbox.stub(worker.cisStopsModel, "truncate");
        sandbox.stub(worker.cisStopsModel, "save");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by checkForNewData method", async () => {
        await worker.checkForNewData();
        sandbox.assert.calledOnce(worker.dataSource.getLastModified);
        sandbox.assert.calledOnce(worker.dataSourceCisStops.getLastModified);
        sandbox.assert.calledTwice(worker.metaModel.getLastModified);
        sandbox.assert.calledTwice(worker.sendMessageToExchange);
        sandbox.assert.callOrder(
            worker.dataSource.getLastModified,
            worker.metaModel.getLastModified,
            worker.dataSourceCisStops.getLastModified,
            worker.metaModel.getLastModified,
            worker.sendMessageToExchange);
    });

    it("should calls the correct methods by downloadFiles method", async () => {
        await worker.downloadFiles();
        sandbox.assert.calledOnce(worker.dataSource.getAll);
        sandbox.assert.calledOnce(worker.metaModel.save);
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
            worker.dataSource.getAll,
            worker.metaModel.save,
            worker.sendMessageToExchange);
    });

    it("should calls the correct methods by transformData method", async () => {
        await worker.transformData({content: new Buffer(JSON.stringify(testData[0]))});
        sandbox.assert.calledOnce(worker.readFile);
        sandbox.assert.calledOnce(worker.transformation.TransformDataElement);
        sandbox.assert.calledWith(worker.transformation.TransformDataElement, testData[0]);
        sandbox.assert.calledOnce(worker.getModelByName);
        sandbox.assert.calledWith(worker.getModelByName, testTransformedData.name);
        sandbox.assert.calledOnce(modelTruncateStub);
        sandbox.assert.calledOnce(worker.metaModel.save);
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
        await worker.saveDataToDB({content: new Buffer(JSON.stringify(testTransformedData))});
        sandbox.assert.calledOnce(worker.getModelByName);
        sandbox.assert.calledWith(worker.getModelByName, testTransformedData.name);
        sandbox.assert.calledOnce(modelSaveStub);
        sandbox.assert.calledWith(modelSaveStub, testTransformedData.data);
    });

    it("should calls the correct methods by checkSavedRowsAndReplaceTables method", async () => {
        await worker.checkSavedRowsAndReplaceTables();
        sandbox.assert.calledOnce(worker.metaModel.checkSavedRowsAndReplaceTables);
    });

    it("should calls the correct methods by downloadCisStops method", async () => {
        await worker.downloadCisStops();
        sandbox.assert.calledOnce(worker.dataSourceCisStops.getAll);
        sandbox.assert.calledOnce(worker.metaModel.getLastModified);
        sandbox.assert.calledTwice(worker.metaModel.save);
        sandbox.assert.calledOnce(worker.transformationCisStops.TransformDataCollection);
        sandbox.assert.calledOnce(worker.cisStopGroupsModel.truncate);
        sandbox.assert.calledOnce(worker.cisStopGroupsModel.save);
        sandbox.assert.calledOnce(worker.cisStopsModel.truncate);
        sandbox.assert.calledOnce(worker.cisStopsModel.save);
        sandbox.assert.calledOnce(worker.metaModel.checkSavedRowsAndReplaceTables);
        sandbox.assert.callOrder(
            worker.dataSourceCisStops.getAll,
            worker.metaModel.getLastModified,
            worker.metaModel.save,
            worker.metaModel.save,
            worker.transformationCisStops.TransformDataCollection,
            worker.cisStopGroupsModel.truncate,
            worker.cisStopGroupsModel.save,
            worker.cisStopsModel.truncate,
            worker.cisStopsModel.save,
            worker.metaModel.checkSavedRowsAndReplaceTables);
        sandbox.assert.callCount(PostgresConnector.getConnection, 5);
    });

});
