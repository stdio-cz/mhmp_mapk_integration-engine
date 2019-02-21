/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import MerakiAccessPointsWorker from "../../src/workers/MerakiAccessPointsWorker";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
const sinon = require("sinon");
const { PostgresConnector } = require("../../src/helpers/PostgresConnector");

chai.use(chaiAsPromised);

describe("MerakiAccessPointsWorker", () => {

    let worker;
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox({ useFakeTimers : true });
        sandbox.stub(PostgresConnector, "getConnection")
            .callsFake(() => Object.assign({define: sandbox.stub()}));

        worker = new MerakiAccessPointsWorker();
        sandbox.stub(worker.transformation, "TransformDataCollection")
            .callsFake(() => Object.assign({ observations: [], tags: [] }));
        sandbox.stub(worker.modelObservations, "save");
        sandbox.stub(worker.modelTags, "save");

    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by saveDataToDB method", async () => {
        await worker.saveDataToDB({content: new Buffer(JSON.stringify({}))});
        sandbox.assert.calledOnce(worker.transformation.TransformDataCollection);
        sandbox.assert.calledOnce(worker.modelObservations.save);
        sandbox.assert.calledWith(worker.modelObservations.save, []);
        sandbox.assert.calledOnce(worker.modelTags.save);
        sandbox.assert.calledWith(worker.modelTags.save, []);
        sandbox.assert.callOrder(
            worker.transformation.TransformDataCollection,
            worker.modelObservations.save,
            worker.modelTags.save);
        sandbox.assert.calledTwice(PostgresConnector.getConnection);
    });

});
