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
        sandbox.stub(worker.dataSource, "getAll");
        sandbox.stub(worker.transformation, "TransformDataCollection")
            .callsFake(() => Object.assign({features: [], type: ""}));
        sandbox.stub(worker.model, "save");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by refreshDataInDB method", async () => {
        await worker.refreshDataInDB();
        sandbox.assert.calledOnce(worker.dataSource.getAll);
        sandbox.assert.calledOnce(worker.transformation.TransformDataCollection);
        sandbox.assert.calledOnce(worker.model.save);
        sandbox.assert.callOrder(
            worker.dataSource.getAll,
            worker.transformation.TransformDataCollection,
            worker.model.save);
    });

});
