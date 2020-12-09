"use strict";

import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import * as sinon from "sinon";
import { config } from "../../../src/core/config";
import { PostgresConnector } from "../../../src/core/connectors";
import { EnergeticsWorker } from "../../../src/modules/energetics";

chai.use(chaiAsPromised);

describe("EnergeticsWorker", () => {
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

    it("getVpalacConnectionSettings should return settings with a cookie header", async () => {
        const output = worker['getVpalacConnectionSettings'](
            "TYPE",
            "Cookie:Cookie",
        );

        expect(output.url).to.contain('TYPE');
        expect(output.headers).to.have.property("Cookie", "Cookie:Cookie");
    });
});
