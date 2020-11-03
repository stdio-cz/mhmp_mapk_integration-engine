"use strict";

import { BicycleCounters, Counters } from "@golemio/schema-definitions";
import "mocha";
import * as sinon from "sinon";
import { config } from "../../../src/core/config";
import { PostgresConnector } from "../../../src/core/connectors";
import { CountersWorker } from "../../../src/modules/counters";

describe("CountersWorker", () => {

    let worker;
    let sandbox;
    let queuePrefix;
    let testData;
    let testTransformedData;
    let testMeasurementsData;
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
            directionsPedestrians: [
                { vendor_id: "103047647", id: "ecoCounter-103047647", locations_id: "ecoCounter-100047647" },
                { vendor_id: "104047647", id: "ecoCounter-104047647", locations_id: "ecoCounter-100047647" },
            ],
            locations: [{ vendor_id: "BC_BS-BMZL" }, { vendor_id: "BC_AT-STLA" }],
            locationsPedestrians: [{ vendor_id: "BC_BS-BMZL" }, { vendor_id: "BC_AT-STLA" }],
        };
        testMeasurementsData = [1, 2];
        testEcoCounterMeasurementsTransformedData = [{
            directions_id: null,
            locations_id: null,
            measured_from: new Date().valueOf(),
            measured_to: new Date().valueOf(),
            value: 1,
        }];

        worker = new CountersWorker();

        sandbox.stub(worker.dataSourceEcoCounter, "getAll")
            .callsFake(() => testData);
        sandbox.stub(worker.dataSourceEcoCounterMeasurements, "getAll")
            .callsFake(() => testMeasurementsData);

        sandbox.stub(worker.ecoCounterTransformation, "transform")
            .callsFake(() => testTransformedData);
        sandbox.stub(worker.ecoCounterMeasurementsTransformation, "transform")
            .callsFake(() => testEcoCounterMeasurementsTransformedData);
        sandbox.stub(worker, "sendMessageToExchange").resolves();

        sandbox.stub(worker.countersLocationsModel, "save");
        sandbox.stub(worker.countersDirectionsModel, "save");
        sandbox.stub(worker.countersDetectionsModel, "saveBySqlFunction");

        queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + "counters";
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by refreshEcoCounterDataInDB method", async () => {
        await worker.refreshEcoCounterDataInDB();
        sandbox.assert.calledOnce(worker.dataSourceEcoCounter.getAll);
        sandbox.assert.calledOnce(worker.ecoCounterTransformation.transform);
        sandbox.assert.calledWith(worker.ecoCounterTransformation.transform, testData);
        sandbox.assert.calledOnce(worker.countersLocationsModel.save);
        sandbox.assert.calledOnce(worker.countersDirectionsModel.save);
        sandbox.assert.callCount(worker.sendMessageToExchange, 2);
        testTransformedData.directions.map((f) => {
/*
            sandbox.assert.calledWith(worker.sendMessageToExchange,
                "workers." + queuePrefix + ".updateEcoCounter",
                JSON.stringify({
                    category: "bicycle",
                    directions_id: f.id,
                    id: f.vendor_id,
                    locations_id: f.locations_id,
                }));
*/
            sandbox.assert.calledWith(worker.sendMessageToExchange,
                "workers." + queuePrefix + ".updateEcoCounter",
                JSON.stringify({
                    category: "pedestrian",
                    directions_id: f.id,
                    id: f.vendor_id,
                    locations_id: f.locations_id,
                }));
        });
        sandbox.assert.callOrder(
            worker.dataSourceEcoCounter.getAll,
            worker.ecoCounterTransformation.transform,
            worker.countersLocationsModel.save,
            worker.countersDirectionsModel.save,
            worker.sendMessageToExchange);
    });

    it("should calls the correct methods by updateEcoCounter method (different geo)", async () => {
        await worker.updateEcoCounter({ content: Buffer.from(JSON.stringify({
            category: "pedestrian",
            directions_id: "ecoCounter-103047647",
            id: "103047647",
            locations_id: "ecoCounter-100047647",
        })) });

        sandbox.assert.calledOnce(worker.dataSourceEcoCounterMeasurements.getAll);
        sandbox.assert.calledOnce(worker.ecoCounterMeasurementsTransformation.transform);
        sandbox.assert.calledWith(worker.ecoCounterMeasurementsTransformation.transform, testMeasurementsData);

        sandbox.assert.calledOnce(worker.countersDetectionsModel.saveBySqlFunction);
    });

});
