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
            .callsFake(() => Object.assign({
                define: sandbox.stub().callsFake(() => sequelizeModelStub),
                transaction: sandbox.stub().callsFake(() => Object.assign({commit: sandbox.stub()})),
            }));

        worker = new VehiclePositionsWorker();
        sandbox.stub(worker.transformation, "TransformDataCollection")
            .callsFake(() => Object.assign({ positions: [], stops: [], trips: [] }));
        sandbox.stub(worker.modelPositions, "save");
        sandbox.stub(worker.modelPositions, "getPositionsForUdpateDelay")
            .callsFake(() => [{gtfs_trip_id: "0000", delay: null}]);
        sandbox.stub(worker.modelPositions, "updateDelay");
        sandbox.stub(worker.modelStops, "save");
        sandbox.stub(worker.modelTrips, "save")
            .callsFake(() => testData);
        sandbox.stub(worker.modelTrips, "findAndUpdateGTFSTripId");
        sandbox.stub(worker, "sendMessageToExchange");
        sandbox.stub(worker.delayComputationTripsModel, "findOneById")
            .callsFake(() => Object.assign({shape_points: []}));
        sandbox.stub(worker, "getEstimatedPoint")
            .callsFake(() => Object.assign({properties: {time_delay: 0, shape_dist_traveled: 0, next_stop_id: "00"}}));
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by saveDataToDB method", async () => {
        await worker.saveDataToDB({content: new Buffer(JSON.stringify({m: {spoj: {}}}))});
        sandbox.assert.calledOnce(worker.transformation.TransformDataCollection);
        sandbox.assert.calledOnce(worker.modelPositions.save);
        sandbox.assert.calledWith(worker.modelPositions.save, []);
        sandbox.assert.calledOnce(worker.modelTrips.save);
        sandbox.assert.calledWith(worker.modelTrips.save, []);
        sandbox.assert.calledTwice(worker.sendMessageToExchange);
        sandbox.assert.callOrder(
            worker.transformation.TransformDataCollection,
            worker.modelPositions.save,
            worker.modelTrips.save,
            worker.sendMessageToExchange);
        sandbox.assert.calledThrice(PostgresConnector.getConnection);
    });

    it("should calls the correct methods by updateGTFSTripId method", async () => {
        await worker.updateGTFSTripId({content: new Buffer(JSON.stringify({id: 0}))});
        sandbox.assert.calledOnce(worker.modelTrips.findAndUpdateGTFSTripId);
        sandbox.assert.calledOnce(worker.sendMessageToExchange);
    });

    it("should calls the correct methods by updateDelay method", async () => {
        await worker.updateDelay({content: new Buffer("0")});
        sandbox.assert.calledOnce(worker.modelPositions.getPositionsForUdpateDelay);
        sandbox.assert.calledOnce(worker.delayComputationTripsModel.findOneById);
        sandbox.assert.calledOnce(worker.getEstimatedPoint);
        sandbox.assert.calledOnce(worker.modelPositions.updateDelay);
    });

});
