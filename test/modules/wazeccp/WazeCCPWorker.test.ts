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
        sandbox = sinon.createSandbox({ useFakeTimers : true });
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

        testDataAlerts = { startTimeMillis: 1574245920000, alerts: [1, 2] };
        testDataIrregularities = { startTimeMillis: 1574245920000, irregularities: [1, 2] };
        testDataJams = { startTimeMillis: 1574245920000, jams: [1, 2] };
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

        sandbox.stub(worker.modelAlerts, "save");
        sandbox.stub(worker.modelIrregularities, "save");
        sandbox.stub(worker.modelJams, "save");

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
        sandbox.assert.calledOnce(worker.modelAlerts.save);
        sandbox.assert.callOrder(
            worker.dataSourceAlerts.getAll,
            worker.transformationAlerts.transform,
            worker.modelAlerts.save);
    });

    it("should calls the correct methods by refreshIrregularitiesInDB method", async () => {
        await worker.refreshIrregularitiesInDB();
        sandbox.assert.calledOnce(worker.dataSourceIrregularities.getAll);
        sandbox.assert.calledOnce(worker.transformationIrregularities.transform);
        sandbox.assert.calledWith(worker.transformationIrregularities.transform, testDataIrregularities);
        sandbox.assert.calledOnce(worker.modelIrregularities.save);
        sandbox.assert.callOrder(
            worker.dataSourceIrregularities.getAll,
            worker.transformationIrregularities.transform,
            worker.modelIrregularities.save);
    });

    it("should calls the correct methods by refreshJamsInDB method", async () => {
        await worker.refreshJamsInDB();
        sandbox.assert.calledOnce(worker.dataSourceJams.getAll);
        sandbox.assert.calledOnce(worker.transformationJams.transform);
        sandbox.assert.calledWith(worker.transformationJams.transform, testDataJams);
        sandbox.assert.calledOnce(worker.modelJams.save);
        sandbox.assert.callOrder(
            worker.dataSourceJams.getAll,
            worker.transformationJams.transform,
            worker.modelJams.save);
    });

    it("should calls the correct methods by refreshAllDataInDB method", async () => {
        await worker.refreshAllDataInDB();
        sandbox.assert.calledThrice(worker.sendMessageToExchange);
        [ "refreshAlertsInDB", "refreshIrregularitiesInDB", "refreshJamsInDB" ].map((f) => {
            sandbox.assert.calledWith(worker.sendMessageToExchange,
                "workers." + queuePrefix + "." + f,
                Buffer.from("Just do it!"));
        });
    });

});
