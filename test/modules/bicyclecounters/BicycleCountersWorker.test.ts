"use strict";

import { BicycleCounters } from "@golemio/schema-definitions";
import "mocha";
import * as sinon from "sinon";
import { config } from "../../../src/core/config";
import { PostgresConnector } from "../../../src/core/connectors";
import { BicycleCountersWorker } from "../../../src/modules/bicyclecounters";

describe("BicycleCountersWorker", () => {

    let worker;
    let sandbox;
    let queuePrefix;
    let testData;
    let testTransformedData;
    let testMeasurementsData;
    let testCameaMeasurementsTransformedData;
    let testEcoCounterMeasurementsTransformedData;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        sandbox.stub(PostgresConnector, "getConnection")
            .callsFake(() => Object.assign({
                define: sandbox.stub(),
            }));

        testData = [1, 2];
        testTransformedData = {
            directions: [
                { vendor_id: "103047647", id: "ecoCounter-103047647", locations_id: "ecoCounter-100047647" },
                { vendor_id: "104047647", id: "ecoCounter-104047647", locations_id: "ecoCounter-100047647" },
            ],
            locations: [{ vendor_id: "BC_BS-BMZL" }, { vendor_id: "BC_AT-STLA" }],
        };
        testMeasurementsData = [1, 2];
        testCameaMeasurementsTransformedData = {
            detections: [1, 2],
            temperatures: [1, 2],
        };
        testEcoCounterMeasurementsTransformedData = [{
            directions_id: null,
            locations_id: null,
            measured_from: new Date().valueOf(),
            measured_to: new Date().valueOf(),
            value: 1,
        }];

        worker = new BicycleCountersWorker();

        sandbox.stub(worker.dataSourceCamea, "getAll")
            .callsFake(() => testData);
        sandbox.stub(worker.dataSourceCameaMeasurements, "getAll")
            .callsFake(() => testMeasurementsData);
        sandbox.stub(worker.dataSourceEcoCounter, "getAll")
            .callsFake(() => testData);
        sandbox.stub(worker.dataSourceEcoCounterMeasurements, "getAll")
            .callsFake(() => testMeasurementsData);

        sandbox.stub(worker.cameaTransformation, "transform")
            .callsFake(() => testTransformedData);
        sandbox.stub(worker.cameaMeasurementsTransformation, "transform")
            .callsFake(() => testCameaMeasurementsTransformedData);
        sandbox.stub(worker.ecoCounterTransformation, "transform")
            .callsFake(() => testTransformedData);
        sandbox.stub(worker.ecoCounterMeasurementsTransformation, "transform")
            .callsFake(() => testEcoCounterMeasurementsTransformedData);

        sandbox.stub(worker.locationsModel, "save");
        sandbox.stub(worker.directionsModel, "save");
        sandbox.stub(worker.detectionsModel, "saveBySqlFunction");
        sandbox.stub(worker.temperaturesModel, "saveBySqlFunction");
        sandbox.stub(worker, "sendMessageToExchange");
        queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + BicycleCounters.name.toLowerCase();
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by refreshCameaDataInDB method", async () => {
        await worker.refreshCameaDataInDB();
        sandbox.assert.calledOnce(worker.dataSourceCamea.getAll);
        sandbox.assert.calledOnce(worker.cameaTransformation.transform);
        sandbox.assert.calledWith(worker.cameaTransformation.transform, testData);
        sandbox.assert.calledOnce(worker.locationsModel.save);
        sandbox.assert.calledOnce(worker.directionsModel.save);
        sandbox.assert.calledTwice(worker.sendMessageToExchange);
        testTransformedData.locations.map((f) => {
            sandbox.assert.calledWith(worker.sendMessageToExchange,
                "workers." + queuePrefix + ".updateCamea",
                JSON.stringify({ id: f.vendor_id }));
        });
        sandbox.assert.callOrder(
            worker.dataSourceCamea.getAll,
            worker.cameaTransformation.transform,
            worker.locationsModel.save,
            worker.directionsModel.save,
            worker.sendMessageToExchange);
    });

    it("should calls the correct methods by updateCamea method (different geo)", async () => {
        await worker.updateCamea({ content: Buffer.from(JSON.stringify({id: "BC_BS-BMZL"})) });

        sandbox.assert.calledOnce(worker.dataSourceCameaMeasurements.getAll);
        sandbox.assert.calledOnce(worker.cameaMeasurementsTransformation.transform);
        sandbox.assert.calledWith(worker.cameaMeasurementsTransformation.transform, testMeasurementsData);

        sandbox.assert.calledOnce(worker.detectionsModel.saveBySqlFunction);
        sandbox.assert.calledOnce(worker.temperaturesModel.saveBySqlFunction);
    });

    it("should calls the correct methods by refreshEcoCounterDataInDB method", async () => {
        await worker.refreshEcoCounterDataInDB();
        sandbox.assert.calledOnce(worker.dataSourceEcoCounter.getAll);
        sandbox.assert.calledOnce(worker.ecoCounterTransformation.transform);
        sandbox.assert.calledWith(worker.ecoCounterTransformation.transform, testData);
        sandbox.assert.calledOnce(worker.locationsModel.save);
        sandbox.assert.calledOnce(worker.directionsModel.save);
        sandbox.assert.calledTwice(worker.sendMessageToExchange);
        testTransformedData.directions.map((f) => {
            sandbox.assert.calledWith(worker.sendMessageToExchange,
                "workers." + queuePrefix + ".updateEcoCounter",
                JSON.stringify({id: f.vendor_id, directions_id: f.id, locations_id: f.locations_id}));
        });
        sandbox.assert.callOrder(
            worker.dataSourceEcoCounter.getAll,
            worker.ecoCounterTransformation.transform,
            worker.locationsModel.save,
            worker.directionsModel.save,
            worker.sendMessageToExchange);
    });

    it("should calls the correct methods by updateEcoCounter method (different geo)", async () => {
        await worker.updateEcoCounter({ content: Buffer.from(JSON.stringify({
            directions_id: "ecoCounter-103047647",
            id: "103047647",
            locations_id: "ecoCounter-100047647",
        })) });

        sandbox.assert.calledOnce(worker.dataSourceEcoCounterMeasurements.getAll);
        sandbox.assert.calledOnce(worker.ecoCounterMeasurementsTransformation.transform);
        sandbox.assert.calledWith(worker.ecoCounterMeasurementsTransformation.transform, testMeasurementsData);

        sandbox.assert.calledOnce(worker.detectionsModel.saveBySqlFunction);
    });

});
