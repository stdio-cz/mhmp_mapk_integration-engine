/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import ParkingZonesWorker from "../../src/workers/ParkingZonesWorker";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
const sinon = require("sinon");

chai.use(chaiAsPromised);

describe("ParkingZonesWorker", () => {

    let worker;
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox({ useFakeTimers : true });
        worker = new ParkingZonesWorker();
        sandbox.stub(worker.dataSource, "GetAll");
        sandbox.stub(worker.dataSourceTariffs, "GetAll")
            .callsFake(() => []);
        sandbox.stub(worker.transformation, "setTariffs");
        sandbox.stub(worker.transformation, "TransformDataCollection");
        sandbox.stub(worker.model, "SaveToDb");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by refreshDataInDB method", async () => {
        await worker.refreshDataInDB();
        sandbox.assert.calledOnce(worker.dataSource.GetAll);
        sandbox.assert.calledOnce(worker.dataSourceTariffs.GetAll);
        sandbox.assert.calledOnce(worker.transformation.setTariffs);
        sandbox.assert.calledOnce(worker.transformation.TransformDataCollection);
        sandbox.assert.calledOnce(worker.model.SaveToDb);
        sandbox.assert.callOrder(
            worker.dataSource.GetAll,
            worker.dataSourceTariffs.GetAll,
            worker.transformation.setTariffs,
            worker.transformation.TransformDataCollection,
            worker.model.SaveToDb);
    });

});
