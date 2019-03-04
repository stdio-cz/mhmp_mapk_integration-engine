/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import SharedCarsWorker from "../../src/workers/SharedCarsWorker";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
const sinon = require("sinon");

chai.use(chaiAsPromised);

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
