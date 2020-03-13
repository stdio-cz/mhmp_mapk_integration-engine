"use strict";

import "mocha";
import * as sinon from "sinon";
import { PostgresConnector } from "../../../src/core/connectors";
import { CityDistrictsWorker } from "../../../src/modules/citydistricts";

describe("CityDistrictsWorker", () => {

    let worker;
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        sandbox.stub(PostgresConnector, "getConnection")
            .callsFake(() => Object.assign({define: sandbox.stub()}));

        worker = new CityDistrictsWorker();
        sandbox.stub(worker.dataSource, "getAll");
        sandbox.stub(worker.transformation, "transform")
            .callsFake(() => Object.assign({features: [], type: ""}));
        sandbox.stub(worker.model, "save");
        sandbox.stub(worker.postgresTransformation, "transform")
            .callsFake(() => []);
        sandbox.stub(worker.postgresModel, "save");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by refreshDataInDB method", async () => {
        await worker.refreshDataInDB();
        sandbox.assert.calledOnce(worker.dataSource.getAll);
        sandbox.assert.calledOnce(worker.transformation.transform);
        sandbox.assert.calledOnce(worker.model.save);
        sandbox.assert.calledOnce(worker.postgresTransformation.transform);
        sandbox.assert.calledOnce(worker.postgresModel.save);
        sandbox.assert.callOrder(
            worker.dataSource.getAll,
            worker.transformation.transform,
            worker.postgresTransformation.transform,
            worker.model.save,
            worker.postgresModel.save);
    });

});
