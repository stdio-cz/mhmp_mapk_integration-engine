"use strict";

import { BicycleCounters } from "@golemio/schema-definitions";
import "mocha";
import * as sinon from "sinon";
import { config } from "../../../src/core/config";
import { BicycleCountersWorker } from "../../../src/modules/bicyclecounters";

describe("BicycleCountersWorker", () => {

    let worker;
    let sandbox;
    let queuePrefix;
    let testData;
    let testTransformedData;
    let testSavedData;
    let testQueueDataCamea;
    let testQueueDataEcoCounter;
    let data0;
    let data1;

    let testMeasurementsData;
    let testMeasurementsTransformedData;
    let measurementsData0;
    let measurementsData1;

    beforeEach(() => {
        sandbox = sinon.createSandbox({ useFakeTimers: true });

        testData = [1, 2];
        testTransformedData = [
            { properties: { id: "101", directions: [{ id: "100101" }, { id: "100102" }] } },
            { properties: { id: "102", directions: [{ id: "100201" }, { id: "100202" }] } },
        ];
        data0 = { _id: "1001" };
        data1 = { _id: "1002", save: sandbox.stub().resolves(true) };
        testSavedData = [
            { properties: { id: "101", directions: [{ id: "100101" }, { id: "100102" }] } },
            { properties: { id: "102", directions: [{ id: "100201" }, { id: "100202" }] } },
        ];
        testQueueDataCamea = testSavedData.map((x) => ({ id: x.properties.id }));
        testQueueDataEcoCounter = [];
        testSavedData.forEach((x) => {
            x.properties.directions.forEach((d) => {
                testQueueDataEcoCounter.push({ id: x.properties.id, direction_id: d.id });
            });
        });

        testMeasurementsData = [1, 2];
        testMeasurementsTransformedData = [
            { directions: [{ value: 1 }], measured_to: "1" },
            { directions: [{ value: 5 }], measured_to: "2" },
        ];
        measurementsData0 = { id: "100101" };
        measurementsData1 = { id: "100102", save: sandbox.stub().resolves(true) };

        worker = new BicycleCountersWorker();

        sandbox.stub(worker.dataSourceCamea, "getAll")
            .callsFake(() => testData);
        sandbox.stub(worker.cameaTransformation, "transform")
            .callsFake(() => testTransformedData);
        sandbox.stub(worker.dataSourceCameaMeasurements, "getAll")
            .callsFake(() => testMeasurementsData);
        sandbox.stub(worker.cameaMeasurementsTransformation, "transform")
            .callsFake(() => testMeasurementsTransformedData);

        sandbox.stub(worker.dataSourceEcoCounter, "getAll")
            .callsFake(() => testData);
        sandbox.stub(worker.ecoCounterTransformation, "transform")
            .callsFake(() => testTransformedData);
        sandbox.stub(worker.dataSourceEcoCounterMeasurements, "getAll")
            .callsFake(() => testMeasurementsData);
        sandbox.stub(worker.ecoCounterMeasurementsTransformation, "transform")
            .callsFake(() => testMeasurementsTransformedData);

        sandbox.stub(worker.model, "save").callsFake(() => testSavedData);
        sandbox.stub(worker.measurementsModel, "save");
        sandbox.stub(worker, "sendMessageToExchange");
        queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + BicycleCounters.name.toLowerCase();
        sandbox.stub(worker.measurementsModel, "find")
            .callsFake(() => [measurementsData0, measurementsData1]);

    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by refreshCameaDataInDB method", async () => {
        await worker.refreshCameaDataInDB();
        sandbox.assert.calledOnce(worker.dataSourceCamea.getAll);
        sandbox.assert.calledOnce(worker.cameaTransformation.transform);
        sandbox.assert.calledWith(worker.cameaTransformation.transform, testData);
        sandbox.assert.calledOnce(worker.model.save);
        sandbox.assert.calledTwice(worker.sendMessageToExchange);
        testQueueDataCamea.map((f) => {
            sandbox.assert.calledWith(worker.sendMessageToExchange,
                "workers." + queuePrefix + ".updateCamea",
                JSON.stringify(f));
        });
        sandbox.assert.callOrder(
            worker.dataSourceCamea.getAll,
            worker.cameaTransformation.transform,
            worker.model.save,
            worker.sendMessageToExchange);
    });

    it("should calls the correct methods by updateCamea method (different geo)", async () => {
        await worker.updateCamea({ content: Buffer.from(JSON.stringify(testQueueDataCamea[1])) });

        sandbox.assert.calledOnce(worker.dataSourceCameaMeasurements.getAll);
        sandbox.assert.calledOnce(worker.cameaMeasurementsTransformation.transform);
        sandbox.assert.calledWith(worker.cameaMeasurementsTransformation.transform, testMeasurementsData);

        sandbox.assert.calledOnce(worker.measurementsModel.find);
        sandbox.assert.calledWith(worker.measurementsModel.find, {
            counter_id: testQueueDataCamea[1].id,
            measured_to: {
                $in: testMeasurementsTransformedData.map((x) => x.measured_to),
            },
        });

        sandbox.assert.calledOnce(worker.measurementsModel.save);
    });

    it("should calls the correct methods by refreshEcoCounterDataInDB method", async () => {
        await worker.refreshEcoCounterDataInDB();
        sandbox.assert.calledOnce(worker.dataSourceEcoCounter.getAll);
        sandbox.assert.calledOnce(worker.ecoCounterTransformation.transform);
        sandbox.assert.calledWith(worker.ecoCounterTransformation.transform, testData);
        sandbox.assert.calledOnce(worker.model.save);
        // sandbox.assert.calledTwice(worker.sendMessageToExchange);
        testQueueDataEcoCounter.map((f) => {
            sandbox.assert.calledWith(worker.sendMessageToExchange,
                "workers." + queuePrefix + ".updateEcoCounter",
                JSON.stringify(f));
        });
        sandbox.assert.callOrder(
            worker.dataSourceEcoCounter.getAll,
            worker.ecoCounterTransformation.transform,
            worker.model.save,
            worker.sendMessageToExchange);
    });

    it("should calls the correct methods by updateEcoCounter method (different geo)", async () => {
        await worker.updateEcoCounter({ content: Buffer.from(JSON.stringify(testQueueDataEcoCounter[1])) });

        sandbox.assert.calledOnce(worker.dataSourceEcoCounterMeasurements.getAll);
        sandbox.assert.calledOnce(worker.ecoCounterMeasurementsTransformation.transform);
        sandbox.assert.calledWith(worker.ecoCounterMeasurementsTransformation.transform, testMeasurementsData);

        sandbox.assert.calledOnce(worker.measurementsModel.find);
        sandbox.assert.calledWith(worker.measurementsModel.find, {
            counter_id: testQueueDataEcoCounter[1].id,
            measured_to: {
                $in: testMeasurementsTransformedData.map((x) => x.measured_to),
            },
        });

        sandbox.assert.calledOnce(worker.measurementsModel.save);
    });
});
