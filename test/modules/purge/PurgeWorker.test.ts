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

});
