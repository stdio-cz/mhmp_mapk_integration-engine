"use strict";

import "mocha";
import * as sinon from "sinon";
import { CityDistrictsWorker } from "../../../src/modules/citydistricts";

describe("CityDistrictsWorker", () => {

    let worker;
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox({ useFakeTimers : true });
        worker = new CityDistrictsWorker();
        sandbox.stub(worker.dataSource, "getAll");
        sandbox.stub(worker.transformation, "transform")
            .callsFake(() => Object.assign({features: [], type: ""}));
        sandbox.stub(worker.model, "save");
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

});
