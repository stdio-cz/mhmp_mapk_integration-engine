"use strict";

import { CustomError } from "@golemio/errors";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import * as sinon from "sinon";
import { DataSourceStream } from "../../../src/core/datasources";
import { PostgresConnector } from "../../../src/core/connectors";
import { EnergeticsBaseWorker } from "../../../src/modules/energetics";

chai.use(chaiAsPromised);

class DummyEnergeticsBaseWorker extends EnergeticsBaseWorker {};

describe("EnergeticsBaseWorker", () => {
    let worker: EnergeticsBaseWorker;
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(PostgresConnector, "getConnection")
            .callsFake(() => Object.assign({ define: sandbox.stub() }));

        worker = new DummyEnergeticsBaseWorker();
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("processDataStream should resolve", async () => {
        const dataStream =  new DataSourceStream({
            objectMode: true,
            read: () => {
                return;
            },
        });

        sandbox.stub(dataStream, "proceed").resolves();

        const promise = worker["processDataStream"](
            Promise.resolve(dataStream),
            (data: any) => Promise.resolve(),
        );

        expect(await promise).to.be.undefined;
    });

    it("processDataStream should reject (datasource error)", async () => {
        const dataStream =  new DataSourceStream({
            objectMode: true,
            read: () => {
                return;
            },
        });

        sandbox.stub(dataStream, "proceed").resolves();

        const promise = worker["processDataStream"](
            Promise.reject(dataStream),
            (data: any) => Promise.resolve(),
        );

        await expect(promise).to.be.rejectedWith(CustomError);
    });

    it("processDataStream should reject (data processor error)", async () => {
        const dataStream =  new DataSourceStream({
            objectMode: true,
            read: () => {
                return;
            },
        });

        sandbox.stub(dataStream, "proceed").rejects();

        const promise = worker["processDataStream"](
            Promise.resolve(dataStream),
            (data: any) => Promise.resolve(),
        );

        await expect(promise).to.be.rejectedWith(CustomError);
    });
});
