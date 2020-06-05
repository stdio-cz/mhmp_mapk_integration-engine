"use strict";

import { WazeCCP } from "@golemio/schema-definitions";
import "mocha";
import * as sinon from "sinon";
import { config } from "../../../src/core/config";
import { PostgresConnector } from "../../../src/core/connectors";
import { WazeCCPWorker } from "../../../src/modules/wazeccp";

describe("WazeCCPWorker", () => {

    let worker;
    let sandbox;
    let sequelizeModelStub;
    let queuePrefix;
    let testDataAlerts;
    let testDataIrregularities;
    let testDataJams;
    let testTransformedData;

    beforeEach(() => {
        sandbox = sinon.createSandbox({ useFakeTimers: true }); // important for `downloadedAt`
        sequelizeModelStub = Object.assign({
            hasMany: sandbox.stub(),
            removeAttribute: sandbox.stub(),
        });
        sandbox.stub(PostgresConnector, "getConnection")
            .callsFake(() => Object.assign({
                define: sandbox.stub().callsFake(() => sequelizeModelStub),
                query: sandbox.stub().callsFake(() => [true]),
                transaction: sandbox.stub().callsFake(() => Object.assign({commit: sandbox.stub()})),
            }));

        testDataAlerts = {
            alerts: [1, 2],
            downloadedAt: new Date().valueOf(),
            startTimeMillis: 1574245920000,
        };
        testDataIrregularities = {
            downloadedAt: new Date().valueOf(),
            irregularities: [1, 2],
            startTimeMillis: 1574245920000,
        };
        testDataJams = {
            downloadedAt: new Date().valueOf(),
            jams: [1, 2],
            startTimeMillis: 1574245920000,
        };
        testTransformedData = [1, 2];

        worker = new WazeCCPWorker();

        sandbox.stub(worker.dataSourceAlerts, "getAll")
            .callsFake(() => testDataAlerts);
        sandbox.stub(worker.dataSourceIrregularities, "getAll")
            .callsFake(() => testDataIrregularities);
        sandbox.stub(worker.dataSourceJams, "getAll")
            .callsFake(() => testDataJams);

        sandbox.stub(worker.transformationAlerts, "transform")
            .callsFake(() => testTransformedData);
        sandbox.stub(worker.transformationIrregularities, "transform")
            .callsFake(() => testTransformedData);
        sandbox.stub(worker.transformationJams, "transform")
            .callsFake(() => testTransformedData);

        sandbox.stub(worker.modelAlerts, "saveBySqlFunction");
        sandbox.stub(worker.modelIrregularities, "saveBySqlFunction");
        sandbox.stub(worker.modelJams, "saveBySqlFunction");

        sandbox.stub(worker, "sendMessageToExchange");
        queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + WazeCCP.name.toLowerCase();
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by refreshAlertsInDB method", async () => {
        await worker.refreshAlertsInDB();
        sandbox.assert.calledOnce(worker.dataSourceAlerts.getAll);
        sandbox.assert.calledOnce(worker.transformationAlerts.transform);
        sandbox.assert.calledWith(worker.transformationAlerts.transform, testDataAlerts);
        sandbox.assert.calledOnce(worker.modelAlerts.saveBySqlFunction);
        sandbox.assert.callOrder(
            worker.dataSourceAlerts.getAll,
            worker.transformationAlerts.transform,
            worker.modelAlerts.saveBySqlFunction);
    });

    it("should calls the correct methods by refreshIrregularitiesInDB method", async () => {
        await worker.refreshIrregularitiesInDB();
        sandbox.assert.calledOnce(worker.dataSourceIrregularities.getAll);
        sandbox.assert.calledOnce(worker.transformationIrregularities.transform);
        sandbox.assert.calledWith(worker.transformationIrregularities.transform, testDataIrregularities);
        sandbox.assert.calledOnce(worker.modelIrregularities.saveBySqlFunction);
        sandbox.assert.callOrder(
            worker.dataSourceIrregularities.getAll,
            worker.transformationIrregularities.transform,
            worker.modelIrregularities.saveBySqlFunction);
    });

    it("should calls the correct methods by refreshJamsInDB method", async () => {
        await worker.refreshJamsInDB();
        sandbox.assert.calledOnce(worker.dataSourceJams.getAll);
        sandbox.assert.calledOnce(worker.transformationJams.transform);
        sandbox.assert.calledWith(worker.transformationJams.transform, testDataJams);
        sandbox.assert.calledOnce(worker.modelJams.saveBySqlFunction);
        sandbox.assert.callOrder(
            worker.dataSourceJams.getAll,
            worker.transformationJams.transform,
            worker.modelJams.saveBySqlFunction);
    });

    it("should calls the correct methods by refreshAllDataInDB method", async () => {
        await worker.refreshAllDataInDB();
        sandbox.assert.calledThrice(worker.sendMessageToExchange);
        [ "refreshAlertsInDB", "refreshIrregularitiesInDB", "refreshJamsInDB" ].map((f) => {
            sandbox.assert.calledWith(worker.sendMessageToExchange,
                "workers." + queuePrefix + "." + f,
                "Just do it!");
        });
    });

});
