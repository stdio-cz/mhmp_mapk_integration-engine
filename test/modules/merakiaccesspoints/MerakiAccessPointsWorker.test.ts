"use strict";

import "mocha";
import * as sinon from "sinon";
import { PostgresConnector } from "../../../src/core/connectors";
import { MerakiAccessPointsWorker } from "../../../src/modules/merakiaccesspoints";

describe("MerakiAccessPointsWorker", () => {

    let worker;
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox({ useFakeTimers : true });
        sandbox.stub(PostgresConnector, "getConnection")
            .callsFake(() => Object.assign({define: sandbox.stub()}));

        worker = new MerakiAccessPointsWorker();
        sandbox.stub(worker.transformation, "transform")
            .callsFake(() => Object.assign({ observations: [], tags: [] }));
        sandbox.stub(worker.modelObservations, "save");
        sandbox.stub(worker.modelTags, "save");

    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by saveDataToDB method", async () => {
        await worker.saveDataToDB({content: Buffer.from(JSON.stringify({}))});
        sandbox.assert.calledOnce(worker.transformation.transform);
        sandbox.assert.calledOnce(worker.modelObservations.save);
        sandbox.assert.calledWith(worker.modelObservations.save, []);
        sandbox.assert.calledOnce(worker.modelTags.save);
        sandbox.assert.calledWith(worker.modelTags.save, []);
        sandbox.assert.callOrder(
            worker.transformation.transform,
            worker.modelObservations.save,
            worker.modelTags.save);
        sandbox.assert.calledTwice(PostgresConnector.getConnection);
    });

});
