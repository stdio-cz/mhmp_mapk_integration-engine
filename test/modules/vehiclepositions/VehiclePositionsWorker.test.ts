"use strict";

import "mocha";
import * as sinon from "sinon";
import { PostgresConnector, RedisConnector } from "../../../src/core/connectors";
import { VehiclePositionsWorker } from "../../../src/modules/vehiclepositions";

describe("VehiclePositionsWorker", () => {

    let worker;
    let sandbox;
    let sequelizeModelStub;
    let testData;

    beforeEach(() => {
        testData = {
            inserted: [{
                cis_short_name: "999",
                id: "999",
                start_cis_stop_id: "999",
                start_cis_stop_platform_code: "a",
                start_timestamp: null,
            }], updated: [],
        };

        sandbox = sinon.createSandbox({ useFakeTimers: true });
        sequelizeModelStub = Object.assign({
            hasMany: sandbox.stub(),
            hasOne: sandbox.stub(),
            removeAttribute: sandbox.stub(),
        });
        sandbox.stub(PostgresConnector, "getConnection")
            .callsFake(() => Object.assign({
                define: sandbox.stub().callsFake(() => sequelizeModelStub),
                query: sandbox.stub().callsFake(() => [true]),
                transaction: sandbox.stub().callsFake(() => Object.assign({ commit: sandbox.stub() })),
            }));
        sandbox.stub(RedisConnector, "getConnection");

        worker = new VehiclePositionsWorker();
        sandbox.stub(worker.transformation, "transform")
            .callsFake(() => Object.assign({ positions: [], stops: [], trips: [] }));
        sandbox.stub(worker.modelPositions, "save");
        sandbox.stub(worker.modelPositions, "getPositionsForUdpateDelay")ze
            .callsFake(() => { gtfs_trip_id: "0000", positions: [{ delay: null }]});
        sandbox.stub(worker.modelPositions, "updateDelay");
        sandbox.stub(worker.modelStops, "saveBySqlFunction");
        sandbox.stub(worker.modelTrips, "saveBySqlFunction")
            .callsFake(() => testData);
        sandbox.stub(worker.modelTrips, "findAll")
            .callsFake((options) => Object.assign([]));
        sandbox.stub(worker.modelTrips, "findGTFSTripId");
        sandbox.stub(worker.modelTrips, "update");
        sandbox.stub(worker, "sendMessageToExchange");
        sandbox.stub(worker.delayComputationTripsModel, "getData")
            .callsFake(() => Object.assign({ shape_points: [] }));
        sandbox.stub(worker, "getEstimatedPoint")
            .callsFake(() => Object.assign({
                properties: { time_delay: 0, shape_dist_traveled: 0, next_stop_id: "00" } }));
        sandbox.stub(worker.gtfsRtModel, "save");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by saveDataToDB method", async () => {
        await worker.saveDataToDB({ content: Buffer.from(JSON.stringify({ m: { spoj: {} } })) });
        sandbox.assert.calledOnce(worker.transformation.transform);
        sandbox.assert.calledOnce(worker.modelPositions.save);
        sandbox.assert.calledWith(worker.modelPositions.save, []);
        sandbox.assert.calledOnce(worker.modelTrips.saveBySqlFunction);
        sandbox.assert.calledWith(worker.modelTrips.saveBySqlFunction, []);
        sandbox.assert.calledOnce(worker.sendMessageToExchange);
        sandbox.assert.callOrder(
            worker.transformation.transform,
            worker.modelPositions.save,
            worker.modelTrips.saveBySqlFunction,
            worker.sendMessageToExchange);
        sandbox.assert.callCount(PostgresConnector.getConnection, 5);
    });

    it("should calls the correct methods by saveStopsToDB method", async () => {
        await worker.saveStopsToDB({ content: Buffer.from(JSON.stringify({ m: { spoj: {} } })) });
        sandbox.assert.calledOnce(worker.transformation.transform);
        sandbox.assert.calledOnce(worker.modelStops.saveBySqlFunction);
        sandbox.assert.calledWith(worker.modelStops.saveBySqlFunction, []);
        sandbox.assert.callOrder(
            worker.transformation.transform,
            worker.modelStops.saveBySqlFunction);
        sandbox.assert.callCount(PostgresConnector.getConnection, 5);
    });

    it("should calls the correct methods by generateGtfsRt method", async () => {
        await worker.generateGtfsRt({ content: Buffer.from("0") });
        sandbox.assert.calledOnce(worker.modelTrips.findAll);
        sandbox.assert.callCount(worker.gtfsRtModel.save, 4);
    });

    it("should calls the correct methods by updateGTFSTripId method", async () => {
        await worker.updateGTFSTripId({ content: Buffer.from(JSON.stringify([{ id: 0 }])) });
        sandbox.assert.calledOnce(worker.modelTrips.findGTFSTripId);
        sandbox.assert.calledOnce(worker.sendMessageToExchange);
    });

    it("should calls the correct methods by updateDelay method", async () => {
        await worker.updateDelay({ content: new Array(Buffer.from("0")) });
        sandbox.assert.calledOnce(worker.modelPositions.getPositionsForUdpateDelay);
        sandbox.assert.calledOnce(worker.delayComputationTripsModel.getData);
    });

});
