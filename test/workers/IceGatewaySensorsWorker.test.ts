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
        sandbox.stub(worker.dataSource, "GetAll");
        sandbox.stub(worker.transformation, "TransformDataCollection")
            .callsFake(() => Object.assign({ features: [], type: "" }));
        sandbox.stub(worker.model, "SaveToDb");
        sandbox.stub(worker.historyTransformation, "TransformDataCollection");
        sandbox.stub(worker.historyModel, "SaveToDb");
        sandbox.stub(worker, "sendMessageToExchange");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by refreshDataInDB method", async () => {
        await worker.refreshDataInDB();
        sandbox.assert.calledOnce(worker.dataSource.GetAll);
        sandbox.assert.calledOnce(worker.transformation.TransformDataCollection);
        sandbox.assert.calledOnce(worker.model.SaveToDb);
        sandbox.assert.calledOnce(worker.sendMessageToExchange);
        sandbox.assert.callOrder(
            worker.dataSource.GetAll,
            worker.transformation.TransformDataCollection,
            worker.model.SaveToDb,
            worker.sendMessageToExchange);
    });

    it("should calls the correct methods by saveDataToHistory method", async () => {
        await worker.saveDataToHistory({content: new Buffer(JSON.stringify({}))});
        sandbox.assert.calledOnce(worker.historyTransformation.TransformDataCollection);
        sandbox.assert.calledOnce(worker.historyModel.SaveToDb);
        sandbox.assert.callOrder(
            worker.historyTransformation.TransformDataCollection,
            worker.historyModel.SaveToDb);
    });

});
