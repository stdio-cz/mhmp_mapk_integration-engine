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
        sandbox.stub(worker.modelObservations, "SaveToDb");
        sandbox.stub(worker.modelTags, "SaveToDb");

    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by saveDataToDB method", async () => {
        await worker.saveDataToDB();
        sandbox.assert.calledOnce(worker.transformation.TransformDataCollection);
        sandbox.assert.calledOnce(worker.modelObservations.SaveToDb);
        sandbox.assert.calledWith(worker.modelObservations.SaveToDb, []);
        sandbox.assert.calledOnce(worker.modelTags.SaveToDb);
        sandbox.assert.calledWith(worker.modelTags.SaveToDb, []);
        sandbox.assert.callOrder(
            worker.transformation.TransformDataCollection,
            worker.modelObservations.SaveToDb,
            worker.modelTags.SaveToDb);
        sandbox.assert.calledTwice(PostgresConnector.getConnection);
    });

});
