"use strict";

import "mocha";
import * as sinon from "sinon";
import { PostgresConnector } from "../../../src/core/connectors";
import { AirQualityStationsWorker } from "../../../src/modules/airqualitystations";

describe("AirQualityStationsWorker", () => {

    let worker;
    let sandbox;
    let testData;
    let testTransformedData;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        sandbox.stub(PostgresConnector, "getConnection")
            .callsFake(() => Object.assign({define: sandbox.stub()}));

        testData = [1, 2];
        testTransformedData = [1, 2];

        worker = new AirQualityStationsWorker();

        sandbox.stub(worker.dataSource1H, "getAll")
            .callsFake(() => testData);
        sandbox.stub(worker.dataSource3H, "getAll")
            .callsFake(() => testData);
        sandbox.stub(worker.transformation, "transform")
            .callsFake(() => testTransformedData);
        sandbox.stub(worker.stationsModel, "save");
        sandbox.stub(worker.measurementsModel, "save");
        sandbox.stub(worker.indexesModel, "save");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by refresh1HDataInDB method", async () => {
        await worker.refresh1HDataInDB();
        sandbox.assert.calledOnce(worker.dataSource1H.getAll);
        sandbox.assert.calledOnce(worker.transformation.transform);
        sandbox.assert.calledWith(worker.transformation.transform, testData);
        sandbox.assert.calledOnce(worker.stationsModel.save);
        sandbox.assert.calledOnce(worker.measurementsModel.save);
        sandbox.assert.calledOnce(worker.indexesModel.save);
        sandbox.assert.callOrder(
            worker.dataSource1H.getAll,
            worker.transformation.transform,
            worker.stationsModel.save,
            worker.measurementsModel.save,
            worker.indexesModel.save,
        );
    });

    it("should calls the correct methods by refresh3HDataInDB method", async () => {
        await worker.refresh3HDataInDB();
        sandbox.assert.calledOnce(worker.dataSource3H.getAll);
        sandbox.assert.calledOnce(worker.transformation.transform);
        sandbox.assert.calledWith(worker.transformation.transform, testData);
        sandbox.assert.calledOnce(worker.stationsModel.save);
        sandbox.assert.calledOnce(worker.measurementsModel.save);
        sandbox.assert.calledOnce(worker.indexesModel.save);
        sandbox.assert.callOrder(
            worker.dataSource3H.getAll,
            worker.transformation.transform,
            worker.stationsModel.save,
            worker.measurementsModel.save,
            worker.indexesModel.save,
        );
    });

});
