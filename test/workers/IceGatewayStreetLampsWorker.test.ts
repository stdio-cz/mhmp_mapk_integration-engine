/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import IceGatewayStreetLampsWorker from "../../src/workers/IceGatewayStreetLampsWorker";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
const sinon = require("sinon");
const request = require("request-promise");

chai.use(chaiAsPromised);

describe("IceGatewayStreetLampsWorker", () => {

    let worker;
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox({ useFakeTimers : true });
        worker = new IceGatewayStreetLampsWorker();
        sandbox.stub(worker.dataSource, "GetAll");
        sandbox.stub(worker.transformation, "TransformDataCollection");
        sandbox.stub(worker.model, "SaveToDb");
        sandbox.stub(worker, "sendMessageToExchange");
        sandbox.stub(request, "Request");
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

    it("should calls the correct methods by setDimValue method", async () => {
        await worker.setDimValue({id: 0});
        sandbox.assert.calledOnce(request.Request);
    });

});