/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import IceGatewaySensorsWorker from "../../src/workers/IceGatewaySensorsWorker";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
const sinon = require("sinon");

chai.use(chaiAsPromised);

describe("IceGatewaySensorsWorker", () => {

    let worker;
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox({ useFakeTimers : true });
        worker = new IceGatewaySensorsWorker();
        sandbox.stub(worker.dataSource, "getAll");
        sandbox.stub(worker.transformation, "transform")
            .callsFake(() => Object.assign({ features: [], type: "" }));
        sandbox.stub(worker.model, "save");
        sandbox.stub(worker.historyTransformation, "transform");
        sandbox.stub(worker.historyModel, "save");
        sandbox.stub(worker, "sendMessageToExchange");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by refreshDataInDB method", async () => {
        await worker.refreshDataInDB();
        sandbox.assert.calledOnce(worker.dataSource.getAll);
        sandbox.assert.calledOnce(worker.transformation.transform);
        sandbox.assert.calledOnce(worker.model.save);
        sandbox.assert.calledOnce(worker.sendMessageToExchange);
        sandbox.assert.callOrder(
            worker.dataSource.getAll,
            worker.transformation.transform,
            worker.model.save,
            worker.sendMessageToExchange);
    });

    it("should calls the correct methods by saveDataToHistory method", async () => {
        await worker.saveDataToHistory({content: new Buffer(JSON.stringify({}))});
        sandbox.assert.calledOnce(worker.historyTransformation.transform);
        sandbox.assert.calledOnce(worker.historyModel.save);
        sandbox.assert.callOrder(
            worker.historyTransformation.transform,
            worker.historyModel.save);
    });

});
