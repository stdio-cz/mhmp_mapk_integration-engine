"use strict";

import { BicycleCounters } from "@golemio/schema-definitions";
import "mocha";
import * as sinon from "sinon";
import { config } from "../../../src/core/config";
import { PostgresConnector } from "../../../src/core/connectors";
import { BicycleCountersWorker, CameaRefreshDurations } from "../../../src/modules/bicyclecounters";

describe("BicycleCountersWorker", () => {

    let worker;
    let sandbox;
    let queuePrefix;
    let testData;
    let testTransformedData;
    let testMeasurementsData;
    let testCameaMeasurementsTransformedData;
    let testEcoCounterMeasurementsTransformedData;
    let testApiLogsHitsData;
    let testApiLogsHitsTransformedData;
    let testApiLogsFailuresData;
    let testApiLogsFailuresTransformedData;

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

        testApiLogsHitsData = [
            {
              created_at: "2020-04-01T12:10:00.448511Z",
              id: 17657,
              latency: 351808,
              ping_time: 11067,
            },
            {
              created_at: "2020-04-01T12:11:00.417693Z",
              id: 17658,
              latency: 328694,
              ping_time: 3737,
            },
        ];

        testApiLogsHitsTransformedData = [
            {
              id: 17657,
              latency: 351808,
              measured_at: "2020-04-01T12:10:00.448511Z",
              ping_time: 11067,
            },
            {
              id: 17658,
              latency: 328694,
              measured_at: "2020-04-01T12:11:00.417693Z",
              ping_time: 3737,
            },
        ];

        /* tslint:disable max-line-length */
        testApiLogsFailuresData = [
            {
              created_at: "2020-03-30T09:37:15.092323Z",
              error_code: 200,
              id: 2058,
              issue: "HTTP Error Get \"https://unicam.camea.cz/api/bike-counter/get-all-sensors\": dial tcp 46.13.4.221:443: i/o timeout (Client.Timeout exceeded while awaiting headers)",
              method_id: 0,
              ping: 6703,
            },
            {
              created_at: "2020-03-31T22:46:15.100396Z",
              error_code: 200,
              id: 2059,
              issue: "HTTP Error Get \"https://unicam.camea.cz/api/bike-counter/get-all-sensors\": context deadline exceeded (Client.Timeout exceeded while awaiting headers)",
              method_id: 0,
              ping: 14819,
            },
        ];

        testApiLogsFailuresTransformedData = [
            {
              error_code: 200,
              id: 2058,
              issue: "HTTP Error Get \"https://unicam.camea.cz/api/bike-counter/get-all-sensors\": dial tcp 46.13.4.221:443: i/o timeout (Client.Timeout exceeded while awaiting headers)",
              measured_at: "2020-03-30T09:37:15.092323Z",
              ping: 6703,
            },
            {
              error_code: 200,
              id: 2059,
              issue: "HTTP Error Get \"https://unicam.camea.cz/api/bike-counter/get-all-sensors\": context deadline exceeded (Client.Timeout exceeded while awaiting headers)",
              measured_at: "2020-03-31T22:46:15.100396Z",
              ping: 14819,
            },
        ];

        /* tslint:enable */
        worker = new BicycleCountersWorker();

        sandbox.stub(worker.dataSourceCamea, "getAll")
            .callsFake(() => testData);
        sandbox.stub(worker.dataSourceCameaMeasurements, "getAll")
            .callsFake(() => testMeasurementsData);
        sandbox.stub(worker.dataSourceEcoCounter, "getAll")
            .callsFake(() => testData);
        sandbox.stub(worker.dataSourceEcoCounterMeasurements, "getAll")
            .callsFake(() => testMeasurementsData);
        sandbox.stub(worker.dataSourceApiLogsHits, "getAll")
            .onCall(0).returns(testApiLogsHitsData)
            .onCall(1).returns(testApiLogsHitsData)
            .returns([]);
        sandbox.stub(worker.dataSourceApiLogsFailures, "getAll")
            .onCall(0).returns(testApiLogsFailuresData)
            .onCall(1).returns(testApiLogsFailuresData)
            .returns([]);

        sandbox.stub(worker.cameaTransformation, "transform")
            .callsFake(() => testTransformedData);
        sandbox.stub(worker.cameaMeasurementsTransformation, "transform")
            .callsFake(() => testCameaMeasurementsTransformedData);
        sandbox.stub(worker.ecoCounterTransformation, "transform")
            .callsFake(() => testTransformedData);
        sandbox.stub(worker.ecoCounterMeasurementsTransformation, "transform")
            .callsFake(() => testEcoCounterMeasurementsTransformedData);
        sandbox.stub(worker.apiLogsHitsTransformation, "transform")
            .callsFake(() => testApiLogsHitsTransformedData);
        sandbox.stub(worker.apiLogsFailuresTransformation, "transform")
            .callsFake(() => testApiLogsFailuresTransformedData);
        sandbox.stub(worker, "sendMessageToExchange").resolves();

        sandbox.stub(worker.locationsModel, "save");
        sandbox.stub(worker.directionsModel, "save");
        sandbox.stub(worker.detectionsModel, "saveBySqlFunction");
        sandbox.stub(worker.temperaturesModel, "saveBySqlFunction");
        sandbox.stub(worker.apiLogsHitsModel, "save");
        sandbox.stub(worker.apiLogsFailuresModel, "save");

        sandbox.spy(worker, "getApiLogsData");

        queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + BicycleCounters.name.toLowerCase();
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by refreshCameaDataLastXHoursInDB method", async () => {
        await worker.refreshCameaDataLastXHoursInDB();
        sandbox.assert.calledOnce(worker.dataSourceCamea.getAll);
        sandbox.assert.calledOnce(worker.cameaTransformation.transform);
        sandbox.assert.calledWith(worker.cameaTransformation.transform, testData);
        sandbox.assert.calledOnce(worker.locationsModel.save);
        sandbox.assert.calledOnce(worker.directionsModel.save);
        sandbox.assert.calledTwice(worker.sendMessageToExchange);
        testTransformedData.locations.map((f) => {
            sandbox.assert.calledWith(worker.sendMessageToExchange,
                "workers." + queuePrefix + ".updateCamea",
                JSON.stringify({ id: f.vendor_id, duration: CameaRefreshDurations.last3Hours }));
        });
        sandbox.assert.callOrder(
            worker.dataSourceCamea.getAll,
            worker.cameaTransformation.transform,
            worker.locationsModel.save,
            worker.directionsModel.save,
            worker.sendMessageToExchange);
    });

    it("should calls the correct methods by refreshCameaDataPreviousDayInDB method", async () => {
        await worker.refreshCameaDataPreviousDayInDB();
        sandbox.assert.calledOnce(worker.dataSourceCamea.getAll);
        sandbox.assert.calledOnce(worker.cameaTransformation.transform);
        sandbox.assert.calledWith(worker.cameaTransformation.transform, testData);
        sandbox.assert.calledOnce(worker.locationsModel.save);
        sandbox.assert.calledOnce(worker.directionsModel.save);
        sandbox.assert.calledTwice(worker.sendMessageToExchange);
        testTransformedData.locations.map((f) => {
            sandbox.assert.calledWith(worker.sendMessageToExchange,
                "workers." + queuePrefix + ".updateCamea",
                JSON.stringify({ id: f.vendor_id, duration: CameaRefreshDurations.previousDay }));
        });
        sandbox.assert.callOrder(
            worker.dataSourceCamea.getAll,
            worker.cameaTransformation.transform,
            worker.locationsModel.save,
            worker.directionsModel.save,
            worker.sendMessageToExchange);
    });

    it("should calls the correct methods by updateCamea method (different geo)", async () => {
        await worker.updateCamea({ content: Buffer.from(JSON.stringify({
            duration: CameaRefreshDurations.last3Hours,
            id: "BC_BS-BMZL",
        })) });

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

    it("should calls the correct methods by getApiLogs method", async () => {
        const now = Math.round(new Date().getTime() / 1000);
        config.datasources.BicycleCountersStatPing.startOffsetSec = 7200;
        config.datasources.BicycleCountersStatPing.timeWindowSec = 3600;
        config.datasources.BicycleCountersStatPing.batchLimit = 1;

        await worker.getApiLogs();

        sandbox.assert.calledTwice(worker.getApiLogsData);
        sandbox.assert.calledWith(
            worker.getApiLogsData,
            "hit",
            now - config.datasources.BicycleCountersStatPing.startOffsetSec,
            now,
        );
        sandbox.assert.calledWith(
            worker.getApiLogsData,
            "fail",
            now - config.datasources.BicycleCountersStatPing.startOffsetSec,
            now,
        );

        sandbox.assert.callCount(worker.dataSourceApiLogsFailures.getAll, 3);
        sandbox.assert.callCount(worker.dataSourceApiLogsHits.getAll, 3);
        sandbox.assert.callCount(worker.sendMessageToExchange, 4);

        sandbox.assert.callOrder(
            worker.getApiLogsData,
            worker.dataSourceApiLogsHits.getAll,
            worker.sendMessageToExchange,
            worker.getApiLogsData,
            worker.dataSourceApiLogsFailures.getAll,
            worker.sendMessageToExchange,
        );
    });

    it("should calls the correct methods by saveApiLogs method with hits", async () => {
        await worker.saveApiLogs({
            content: Buffer.from(JSON.stringify({
                data: testApiLogsHitsData,
                type: "hit",
                })),
            },
        );

        sandbox.assert.calledOnce(worker.apiLogsHitsTransformation.transform);
        sandbox.assert.calledWith(worker.apiLogsHitsTransformation.transform, testApiLogsHitsData);
        sandbox.assert.calledOnce(worker.apiLogsHitsModel.save);
        sandbox.assert.calledWith(worker.apiLogsHitsModel.save, testApiLogsHitsTransformedData);

        sandbox.assert.callOrder(
            worker.apiLogsHitsTransformation.transform,
            worker.apiLogsHitsModel.save,
        );
    });
});
