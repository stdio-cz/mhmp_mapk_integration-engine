/// <reference path="../../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import { PostgresConnector } from "../../../src/core/helpers";
import { PurgeWorker } from "../../../src/modules/purge";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
const sinon = require("sinon");

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

    it("should calls the correct methods by deleteOldVehiclePositions method", async () => {
        await worker.deleteOldVehiclePositions();
        sandbox.assert.calledThrice(queryStub);
    });

    it("should calls the correct methods by deleteOldMerakiAccessPointsObservations method", async () => {
        await worker.deleteOldMerakiAccessPointsObservations();
        sandbox.assert.calledOnce(queryStub);
        sandbox.assert.calledWith(queryStub,
            "SELECT * FROM retention('merakiaccesspoints_observations','timestamp',168);");
    });
});
