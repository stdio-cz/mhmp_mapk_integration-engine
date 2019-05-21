/// <reference path="../../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import { SharedBikesWorker } from "../../../src/modules/sharedbikes";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
const sinon = require("sinon");

chai.use(chaiAsPromised);

describe("SharedBikesWorker", () => {

    let worker;
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        worker = new SharedBikesWorker();

        sandbox.stub(worker.homeportLocationsDataSource, "getAll");
        sandbox.stub(worker.homeportOutOfLocationsDataSource, "getAll");
        sandbox.stub(worker.rekolaDataSource, "getAll");
        sandbox.stub(worker.homeportLocationsTransformation, "transform")
            .callsFake(() => []);
        sandbox.stub(worker.homeportOutOfLocationsTransformation, "transform")
            .callsFake(() => []);
        sandbox.stub(worker.rekolaTransformation, "transform")
            .callsFake(() => []);
        sandbox.stub(worker.model, "save");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by refreshDataInDB method", async () => {
        await worker.refreshDataInDB();
        sandbox.assert.calledOnce(worker.homeportLocationsDataSource.getAll);
        sandbox.assert.calledOnce(worker.homeportOutOfLocationsDataSource.getAll);
        sandbox.assert.calledOnce(worker.rekolaDataSource.getAll);
        sandbox.assert.calledOnce(worker.homeportLocationsTransformation.transform);
        sandbox.assert.calledOnce(worker.homeportOutOfLocationsTransformation.transform);
        sandbox.assert.calledOnce(worker.rekolaTransformation.transform);
        sandbox.assert.calledOnce(worker.model.save);
        sandbox.assert.callOrder(
            worker.homeportLocationsDataSource.getAll,
            worker.homeportOutOfLocationsDataSource.getAll,
            worker.rekolaDataSource.getAll,
            worker.homeportLocationsTransformation.transform,
            worker.homeportOutOfLocationsTransformation.transform,
            worker.rekolaTransformation.transform,
            worker.model.save);
    });

});
