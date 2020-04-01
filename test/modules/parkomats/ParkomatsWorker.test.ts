"use strict";

import "mocha";
import * as sinon from "sinon";
import { ParkomatsWorker } from "../../../src/modules/parkomats";

import { PostgresConnector } from "../../../src/core/connectors";

describe("ParkomatsWorker", () => {

    let worker;
    let sandbox;
    let testData;
    let testTransformedData;

    beforeEach(() => {
        sandbox = sinon.createSandbox({ useFakeTimers: true });

        sandbox.stub(PostgresConnector, "getConnection")
            .callsFake(() => Object.assign({
                define: sandbox.stub(),
            }));

        testData = [1, 2];
        testTransformedData = [1, 2];

        worker = new ParkomatsWorker();

        sandbox.stub(worker.dataSource, "getAll")
            .callsFake(() => testData);
        sandbox.stub(worker.transformation, "transform")
            .callsFake(() => testTransformedData);
        sandbox.stub(worker.model, "save");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by refreshDataInDB method", async () => {
        await worker.refreshDataInDB();
        sandbox.assert.calledOnce(worker.dataSource.getAll);
        sandbox.assert.calledOnce(worker.transformation.transform);
        sandbox.assert.calledWith(worker.transformation.transform, testData);
        sandbox.assert.calledOnce(worker.model.save);
        sandbox.assert.callOrder(
            worker.dataSource.getAll,
            worker.transformation.transform,
            worker.model.save);
    });
});
