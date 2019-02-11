/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import VehiclePositionsWorker from "../../src/workers/VehiclePositionsWorker";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
const sinon = require("sinon");
const { PostgresConnector } = require("../../src/helpers/PostgresConnector");

chai.use(chaiAsPromised);

describe("VehiclePositionsWorker", () => {

    let worker;
    let sandbox;
    let sequelizeModelStub;
    let testData;

    beforeEach(() => {
        testData = {inserted: [{
            cis_short_name: "999",
            id: "999",
            start_cis_stop_id: "999",
            start_cis_stop_platform_code: "a",
            start_timestamp: "",
        }], updated: []};

        sandbox = sinon.createSandbox({ useFakeTimers : true });
        sequelizeModelStub = Object.assign({removeAttribute: sandbox.stub()});
        sandbox.stub(PostgresConnector, "getConnection")
            .callsFake(() => Object.assign({define: sandbox.stub().callsFake(() => sequelizeModelStub)}));

        worker = new VehiclePositionsWorker();
        sandbox.stub(worker.transformation, "TransformDataCollection")
            .callsFake(() => Object.assign({ positions: [], stops: [], trips: [] }));
        sandbox.stub(worker.modelPositions, "SaveToDb");
        sandbox.stub(worker.modelPositions, "getPositionsForUdpateDelay")
            .callsFake(() => [{gtfs_trip_id: "0000", delay: null}]);
        sandbox.stub(worker.modelPositions, "updateDelay");
        sandbox.stub(worker.modelStops, "SaveToDb");
        sandbox.stub(worker.modelTrips, "SaveToDb")
            .callsFake(() => testData);
        sandbox.stub(worker.modelTrips, "getTripsWithoutGTFSTripId")
            .callsFake(() => testData.inserted);
        sandbox.stub(worker.modelTrips, "findAndUpdateGTFSTripId");
        sandbox.stub(worker, "sendMessageToExchange");
        sandbox.stub(worker.delayComputationTripsModel, "GetOneFromModel")
            .callsFake(() => Object.assign({shape_points: []}));
        sandbox.stub(worker, "getEstimatedPoint")
            .callsFake(() => Object.assign({properties: {time_delay: 0, shape_dist_traveled: 0, next_stop_id: "00"}}));
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by saveDataToDB method", async () => {
        await worker.saveDataToDB();
        sandbox.assert.calledOnce(worker.transformation.TransformDataCollection);
        sandbox.assert.calledOnce(worker.modelPositions.SaveToDb);
        sandbox.assert.calledWith(worker.modelPositions.SaveToDb, []);
        sandbox.assert.calledOnce(worker.modelStops.SaveToDb);
        sandbox.assert.calledWith(worker.modelStops.SaveToDb, []);
        sandbox.assert.calledOnce(worker.modelTrips.SaveToDb);
        sandbox.assert.calledWith(worker.modelTrips.SaveToDb, []);
        sandbox.assert.calledOnce(worker.sendMessageToExchange);
        sandbox.assert.callOrder(
            worker.transformation.TransformDataCollection,
            worker.modelPositions.SaveToDb,
            worker.modelStops.SaveToDb,
            worker.modelTrips.SaveToDb,
            worker.sendMessageToExchange);
        sandbox.assert.calledThrice(PostgresConnector.getConnection);
    });

    it("should calls the correct methods by getTripsWithoutGTFSTripId method", async () => {
        await worker.getTripsWithoutGTFSTripId();
        sandbox.assert.calledOnce(worker.modelTrips.getTripsWithoutGTFSTripId);
        sandbox.assert.calledOnce(worker.sendMessageToExchange);
        sandbox.assert.callOrder(
            worker.modelTrips.getTripsWithoutGTFSTripId);
        sandbox.assert.calledThrice(PostgresConnector.getConnection);
    });

    it("should calls the correct methods by updateGTFSTripId method", async () => {
        await worker.updateGTFSTripId({id: 0});
        sandbox.assert.calledOnce(worker.modelTrips.findAndUpdateGTFSTripId);
        sandbox.assert.calledOnce(worker.sendMessageToExchange);
    });

    it("should calls the correct methods by updateDelay method", async () => {
        await worker.updateDelay();
        sandbox.assert.calledOnce(worker.modelPositions.getPositionsForUdpateDelay);
        sandbox.assert.calledOnce(worker.delayComputationTripsModel.GetOneFromModel);
        sandbox.assert.calledOnce(worker.getEstimatedPoint);
        sandbox.assert.calledOnce(worker.modelPositions.updateDelay);
    });

});
