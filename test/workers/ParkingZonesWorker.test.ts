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
        sandbox.stub(worker.dataSource, "getAll")
            .callsFake(() => []);
        sandbox.stub(worker.dataSourceTariffs, "getAll")
            .callsFake(() => []);
        sandbox.stub(worker.dataSourceTariffs, "setProtocolStrategy");
        sandbox.stub(worker.transformation, "transform")
            .callsFake(() => []);
        sandbox.stub(worker.transformation, "transformTariffs")
            .callsFake(() => Object.assign({tariffs: [], tariffsText: ""}));
        sandbox.stub(worker.model, "save");
        sandbox.stub(worker.model, "update");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by refreshDataInDB method", async () => {
        await worker.refreshDataInDB();
        sandbox.assert.calledOnce(worker.dataSource.getAll);
        sandbox.assert.calledOnce(worker.transformation.transform);
        sandbox.assert.calledOnce(worker.model.save);
        sandbox.assert.callOrder(
            worker.dataSource.getAll,
            worker.transformation.transform,
            worker.model.save);
    });

    it("should calls the correct methods by updateTariffs method", async () => {
        await worker.updateTariffs({content: new Buffer(JSON.stringify("test"))});
        sandbox.assert.calledOnce(worker.dataSourceTariffs.setProtocolStrategy);
        sandbox.assert.calledOnce(worker.dataSourceTariffs.getAll);
        sandbox.assert.calledOnce(worker.transformation.transformTariffs);
        sandbox.assert.calledOnce(worker.model.update);
        sandbox.assert.callOrder(
            worker.dataSourceTariffs.getAll,
            worker.transformation.transformTariffs,
            worker.model.update);
    });

});
