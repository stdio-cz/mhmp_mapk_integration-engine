"use strict";

import "mocha";
import * as sinon from "sinon";
import { PostgresConnector } from "../../../src/core/connectors";
import { PurgeWorker } from "../../../src/modules/purge";

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
            "SELECT * FROM retention_bigint('merakiaccesspoints_observations','timestamp',168);");
    });
});
