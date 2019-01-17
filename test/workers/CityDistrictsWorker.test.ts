/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import CityDistrictsWorker from "../../src/workers/CityDistrictsWorker";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
const sinon = require("sinon");

chai.use(chaiAsPromised);

describe("CityDistrictsWorker", () => {

    let worker;
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox({ useFakeTimers : true });
        worker = new CityDistrictsWorker();
        sandbox.stub(worker.dataSource, "GetAll");
        sandbox.stub(worker.transformation, "TransformDataCollection");
        sandbox.stub(worker.model, "SaveToDb");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by refreshDataInDB method", async () => {
        await worker.refreshDataInDB();
        sandbox.assert.calledOnce(worker.dataSource.GetAll);
        sandbox.assert.calledOnce(worker.transformation.TransformDataCollection);
        sandbox.assert.calledOnce(worker.model.SaveToDb);
        sandbox.assert.callOrder(
            worker.dataSource.GetAll,
            worker.transformation.TransformDataCollection,
            worker.model.SaveToDb);
    });

});
