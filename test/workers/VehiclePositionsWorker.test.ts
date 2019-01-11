/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import VehiclePositionsWorker from "../../src/workers/VehiclePositionsWorker";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
const sinon = require("sinon");
const { PostgresConnector } = require("../../src/helpers/PostgresConnector");

chai.use(chaiAsPromised);

describe("VehiclePositionsWorker", () => {

    let worker;
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox({ useFakeTimers : true });
        sandbox.stub(PostgresConnector, "getConnection")
            .callsFake(() => Object.assign({define: sandbox.stub()}));

        worker = new VehiclePositionsWorker();
        sandbox.stub(worker.transformation, "TransformDataCollection")
            .callsFake(() => Object.assign({ stops: [], trips: [] }));
        sandbox.stub(worker.modelStops, "SaveToDb");
        sandbox.stub(worker.modelTrips, "SaveToDb");

    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by saveDataToDB method", async () => {
        await worker.saveDataToDB();
        sandbox.assert.calledOnce(worker.transformation.TransformDataCollection);
        sandbox.assert.calledOnce(worker.modelStops.SaveToDb);
        sandbox.assert.calledWith(worker.modelStops.SaveToDb, []);
        sandbox.assert.calledOnce(worker.modelTrips.SaveToDb);
        sandbox.assert.calledWith(worker.modelTrips.SaveToDb, []);
        sandbox.assert.callOrder(
            worker.transformation.TransformDataCollection,
            worker.modelStops.SaveToDb,
            worker.modelTrips.SaveToDb);
        sandbox.assert.calledTwice(PostgresConnector.getConnection);
    });

});
