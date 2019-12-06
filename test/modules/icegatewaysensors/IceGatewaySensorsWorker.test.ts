"use strict";

import "mocha";
import * as sinon from "sinon";
import { IceGatewaySensorsWorker } from "../../../src/modules/icegatewaysensors";

describe("IceGatewaySensorsWorker", () => {

    let worker;
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox({ useFakeTimers : true });
        worker = new IceGatewaySensorsWorker();
        sandbox.stub(worker.dataSource, "getAll");
        sandbox.stub(worker.transformation, "transform")
            .callsFake(() => Object.assign({ features: [], type: "" }));
        sandbox.stub(worker.transformation, "transformHistory");
        sandbox.stub(worker.model, "save");
        sandbox.stub(worker.historyModel, "save");
        sandbox.stub(worker, "sendMessageToExchange");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by refreshDataInDB method", async () => {
        await worker.refreshDataInDB();
        sandbox.assert.calledOnce(worker.dataSource.getAll);
        sandbox.assert.calledOnce(worker.transformation.transform);
        sandbox.assert.calledOnce(worker.model.save);
        sandbox.assert.calledOnce(worker.sendMessageToExchange);
        sandbox.assert.callOrder(
            worker.dataSource.getAll,
            worker.transformation.transform,
            worker.model.save,
            worker.sendMessageToExchange);
    });

    it("should calls the correct methods by saveDataToHistory method", async () => {
        await worker.saveDataToHistory({content: Buffer.from(JSON.stringify({}))});
        sandbox.assert.calledOnce(worker.transformation.transformHistory);
        sandbox.assert.calledOnce(worker.historyModel.save);
        sandbox.assert.callOrder(
            worker.transformation.transformHistory,
            worker.historyModel.save);
    });

});
