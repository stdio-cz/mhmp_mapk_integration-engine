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
        sandbox.stub(worker.dataSource, "getAll");
        sandbox.stub(worker.transformation, "transform")
            .callsFake(() => Object.assign({features: [], type: ""}));
        sandbox.stub(worker.model, "save");
        sandbox.stub(worker, "sendMessageToExchange");
        sandbox.stub(request, "Request");
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

    it("should calls the correct methods by setDimValue method", async () => {
        await worker.setDimValue({content: new Buffer(JSON.stringify({id: 0}))});
        sandbox.assert.calledOnce(request.Request);
    });

});
