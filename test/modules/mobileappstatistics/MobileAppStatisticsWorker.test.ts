"use strict";

import * as jwt from "jsonwebtoken";
import "mocha";
import * as sinon from "sinon";
import { PostgresConnector, RedisConnector } from "../../../src/core/connectors";
import { MobileAppStatisticsWorker } from "../../../src/modules/mobileappstatistics";

describe("MobileAppStatisticsWorker", () => {

    let worker;
    let sandbox;
    let testDataAppStore;
    let testDataPlayStore;
    let testTransformedData;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(RedisConnector, "getConnection");

        testDataAppStore = [
            { "Begin Date": "03/09/2020", "SKU": "test1" },
            { "Begin Date": "03/09/2020", "SKU": "test2" },
        ];
        testDataPlayStore = [
            { "Date": "2020-09-03", "Package Name": "test1" },
            { "Date": "2020-09-03", "Package Name": "test2" },
        ];
        testTransformedData = [1, 2];

        sandbox.stub(PostgresConnector, "getConnection")
            .callsFake(() => Object.assign({define: sandbox.stub()}));

        sandbox.stub(jwt, "sign").callsFake(() => "jwtstring");

        worker = new MobileAppStatisticsWorker();

        sandbox.stub(worker.appStoreDataSource, "getAll")
            .callsFake(() => testDataAppStore);
        sandbox.stub(worker.appStoreTransformation, "transform")
            .callsFake(() => testTransformedData);
        sandbox.stub(worker.appStoreModel, "save");
        sandbox.stub(worker.playStoreDataSource, "getAll")
            .callsFake(() => testDataPlayStore);
        sandbox.stub(worker.playStoreTransformation, "transform")
            .callsFake(() => testTransformedData);
        sandbox.stub(worker.playStoreModel, "save");
        sandbox.stub(worker.redisModel, "getData")
            .callsFake(() => ({data: 1, filepath: 11}).data);
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by refreshAppStoreDataInDB method", async () => {
        await worker.refreshAppStoreDataInDB();
        sandbox.assert.calledOnce(worker.appStoreDataSource.getAll);
        sandbox.assert.calledOnce(worker.appStoreTransformation.transform);
        sandbox.assert.calledWith(worker.appStoreTransformation.transform, testDataAppStore);
        sandbox.assert.calledOnce(worker.appStoreModel.save);
        sandbox.assert.callOrder(
            worker.appStoreDataSource.getAll,
            worker.appStoreTransformation.transform,
            worker.appStoreModel.save);
    });

    it("should calls the correct methods by refreshPlayStoreDataInDB method", async () => {
        await worker.refreshPlayStoreDataInDB();
        sandbox.assert.calledOnce(worker.playStoreDataSource.getAll);
        sandbox.assert.calledOnce(worker.playStoreTransformation.transform);
        sandbox.assert.calledWith(worker.playStoreTransformation.transform, testDataPlayStore);
        sandbox.assert.calledOnce(worker.playStoreModel.save);
        sandbox.assert.callOrder(
            worker.playStoreDataSource.getAll,
            worker.playStoreTransformation.transform,
            worker.playStoreModel.save);
    });

});
