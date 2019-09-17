"use strict";

import "mocha";
import * as sinon from "sinon";
import { SharedCarsWorker } from "../../../src/modules/sharedcars";

describe("SharedCarsWorker", () => {

    let worker;
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox({ useFakeTimers : true });
        worker = new SharedCarsWorker();
        sandbox.stub(worker.ceskyCarsharingDataSource, "getAll");
        sandbox.stub(worker.hoppyGoDataSource, "getAll");
        sandbox.stub(worker.ceskyCarsharingTransformation, "transform")
            .callsFake(() => []);
        sandbox.stub(worker.hoppyGoTransformation, "transform")
            .callsFake(() => []);
        sandbox.stub(worker.model, "save");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by refreshDataInDB method", async () => {
        await worker.refreshDataInDB();
        sandbox.assert.calledOnce(worker.ceskyCarsharingDataSource.getAll);
        sandbox.assert.calledOnce(worker.hoppyGoDataSource.getAll);
        sandbox.assert.calledOnce(worker.ceskyCarsharingTransformation.transform);
        sandbox.assert.calledOnce(worker.hoppyGoTransformation.transform);
        sandbox.assert.calledOnce(worker.model.save);
        sandbox.assert.callOrder(
            worker.ceskyCarsharingDataSource.getAll,
            worker.hoppyGoDataSource.getAll,
            worker.ceskyCarsharingTransformation.transform,
            worker.hoppyGoTransformation.transform,
            worker.model.save);
    });

});
