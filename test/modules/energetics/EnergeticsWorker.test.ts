"use strict";

import "mocha";
import * as sinon from "sinon";
import { PostgresConnector } from "../../../src/core/connectors";
import { EnergeticsWorker } from "../../../src/modules/energetics";

describe("EnergeticssWorker", () => {
    let worker: EnergeticsWorker;
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        sandbox.stub(PostgresConnector, "getConnection")
            .callsFake(() => Object.assign({ define: sandbox.stub() }));

        worker = new EnergeticsWorker();
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("refreshVpalac1HourData: should call the correct methods", async () => {
        await worker.fetchVpalac1HourData({});
        // TODO implement
    });
});
