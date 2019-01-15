/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import PurgeWorker from "../../src/workers/PurgeWorker";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
const sinon = require("sinon");
const { PostgresConnector } = require("../../src/helpers/PostgresConnector");

chai.use(chaiAsPromised);

describe("PurgeWorker", () => {

    let worker;
    let sandbox;
    let queryStub;

    beforeEach(() => {
        sandbox = sinon.createSandbox({ useFakeTimers : true });
        queryStub = sandbox.stub().resolves("fake delete");
        sandbox.stub(PostgresConnector, "getConnection")
            .callsFake(() => Object.assign({query: queryStub}));

        worker = new PurgeWorker();
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by deleteOldVehiclePositionsTrips method", async () => {
        await worker.deleteOldVehiclePositionsTrips();
        sandbox.assert.calledOnce(queryStub);
        sandbox.assert.calledWith(queryStub,
            "SELECT * FROM retention('vehiclepositions_trips','created',48);");
    });

    it("should calls the correct methods by deleteOldVehiclePositionsStops method", async () => {
        await worker.deleteOldVehiclePositionsStops();
        sandbox.assert.calledOnce(queryStub);
        sandbox.assert.calledWith(queryStub,
            "SELECT * FROM retention('vehiclepositions_stops','created',48);");
    });

    it("should calls the correct methods by deleteOldMerakiAccessPointsObservations method", async () => {
        await worker.deleteOldMerakiAccessPointsObservations();
        sandbox.assert.calledOnce(queryStub);
        sandbox.assert.calledWith(queryStub,
            "SELECT * FROM retention('merakiaccesspoints_observations','timestamp',168);");
    });
});
