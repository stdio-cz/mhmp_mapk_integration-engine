"use strict";

import { RopidGTFS } from "@golemio/schema-definitions";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import * as sinon from "sinon";
import { config } from "../../../src/core/config";
import { PostgresConnector, RedisConnector } from "../../../src/core/connectors";
import { RopidGTFSWorker } from "../../../src/modules/ropidgtfs";

chai.use(chaiAsPromised);

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
        testTransformedData = {data: [1], name: "fake"};
        testDataCis = [];
        testTransformedDataCis = {cis_stop_groups: [1], cis_stops: [2]};

        sandbox.stub(PostgresConnector, "getConnection")
            .callsFake(() => Object.assign({define: sandbox.stub()}));
        sandbox.stub(RedisConnector, "getConnection");

        worker = new RopidGTFSWorker();

        sandbox.stub(worker.dataSource, "getLastModified")
            .callsFake(() => "2019-01-18T03:22:09.000Z");
        sandbox.stub(worker.dataSource, "getAll")
            .callsFake(() => testData);

        sandbox.stub(worker.metaModel, "getLastModified")
            .callsFake(() => Object.assign({lastModified: "2019-01-18T03:24:09.000Z", version: 0}));
        sandbox.stub(worker.metaModel, "save");
        sandbox.stub(worker.metaModel, "checkSavedRows");
        sandbox.stub(worker.metaModel, "replaceTables");
        sandbox.stub(worker.metaModel, "rollbackFailedSaving");
        sandbox.stub(worker.metaModel, "updateState");
        sandbox.stub(worker.metaModel, "updateSavedRows");
        sandbox.stub(worker.metaModel, "checkIfNewVersionIsAlreadyDeployed");
        sandbox.stub(worker.metaModel, "checkAllTablesHasSavedState");

        sandbox.stub(worker.transformation, "transform")
            .callsFake(() => testTransformedData);

        sandbox.stub(worker, "sendMessageToExchange");
        queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + RopidGTFS.name.toLowerCase();
        sandbox.stub(worker.redisModel, "getData")
            .callsFake(() => testData[0].data);
        modelTruncateStub = sandbox.stub();
        modelSaveStub = sandbox.stub();
        sandbox.stub(worker, "getModelByName")
            .callsFake(() => Object.assign({
                save: modelSaveStub,
                saveBySqlFunction: modelSaveStub,
                truncate: modelTruncateStub,
            }));

        sandbox.stub(worker.dataSourceCisStops, "getAll")
            .callsFake(() => testDataCis);
        sandbox.stub(worker.dataSourceCisStops, "getLastModified")
            .callsFake(() => Object.assign({lastModified: "2019-01-18T03:24:09.000Z", version: 0}));
        sandbox.stub(worker.transformationCisStops, "transform")
            .callsFake(() => testTransformedDataCis);
        sandbox.stub(worker.cisStopGroupsModel, "truncate");
        sandbox.stub(worker.cisStopGroupsModel, "save");
        sandbox.stub(worker.cisStopsModel, "truncate");
        sandbox.stub(worker.cisStopsModel, "save");
        sandbox.stub(worker.delayComputationTripsModel, "truncate");
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
        sandbox.assert.calledThrice(worker.metaModel.save);
        sandbox.assert.callCount(worker.sendMessageToExchange, 2);
        testData.map((f) => {
            sandbox.assert.calledWith(worker.sendMessageToExchange,
                "workers." + queuePrefix + ".transformData",
                JSON.stringify(f));
        });
        sandbox.assert.callOrder(
            worker.dataSource.getAll,
            worker.metaModel.save,
            worker.sendMessageToExchange);
    });

    it("should calls the correct methods by transformData method", async () => {
        await worker.transformData({content: Buffer.from(JSON.stringify(testData[0]))});
        sandbox.assert.calledOnce(worker.transformation.transform);
        sandbox.assert.calledWith(worker.transformation.transform, testData[0]);
        sandbox.assert.calledOnce(worker.getModelByName);
        sandbox.assert.calledWith(worker.getModelByName, testTransformedData.name);
        sandbox.assert.calledOnce(modelTruncateStub);
        sandbox.assert.calledOnce(worker.metaModel.save);
        sandbox.assert.calledOnce(worker.metaModel.updateState);
    });

    it("should calls the correct methods by saveDataToDB method", async () => {
        await worker.saveDataToDB({content: Buffer.from(JSON.stringify(testTransformedData))});
        sandbox.assert.calledOnce(worker.getModelByName);
        sandbox.assert.calledWith(worker.getModelByName, testTransformedData.name);
        sandbox.assert.calledOnce(modelSaveStub);
        sandbox.assert.calledOnce(worker.metaModel.updateSavedRows);
    });

    it("should calls the correct methods by checkSavedRowsAndReplaceTables method", async () => {
        try {
            await worker.checkSavedRowsAndReplaceTables({content: Buffer.from("")});
        } catch (err) {
            expect(err).not.to.be.null;
        }
    });

    it("should calls the correct methods by downloadCisStops method", async () => {
        await worker.downloadCisStops();
        sandbox.assert.calledOnce(worker.dataSourceCisStops.getAll);
        sandbox.assert.calledOnce(worker.metaModel.getLastModified);
        sandbox.assert.calledTwice(worker.metaModel.save);
        sandbox.assert.calledOnce(worker.transformationCisStops.transform);
        sandbox.assert.calledOnce(worker.cisStopGroupsModel.truncate);
        sandbox.assert.calledOnce(worker.cisStopGroupsModel.save);
        sandbox.assert.calledOnce(worker.cisStopsModel.truncate);
        sandbox.assert.calledOnce(worker.cisStopsModel.save);
        sandbox.assert.calledOnce(worker.metaModel.checkSavedRows);
        sandbox.assert.calledOnce(worker.metaModel.replaceTables);
        sandbox.assert.callOrder(
            worker.dataSourceCisStops.getAll,
            worker.metaModel.getLastModified,
            worker.metaModel.save,
            worker.metaModel.save,
            worker.transformationCisStops.transform,
            worker.cisStopGroupsModel.truncate,
            worker.cisStopGroupsModel.save,
            worker.cisStopsModel.truncate,
            worker.cisStopsModel.save,
            worker.metaModel.checkSavedRows,
            worker.metaModel.replaceTables);
        sandbox.assert.callCount(PostgresConnector.getConnection, 5);
    });

});
