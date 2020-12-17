"use strict";

import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import * as sinon from "sinon";
import { DataSourceStream } from "../../../src/core/datasources";
import { PostgresConnector } from "../../../src/core/connectors";
import { EnergeticsVpalacWorker, UnimonitorCemApi } from "../../../src/modules/energetics";

chai.use(chaiAsPromised);

describe("EnergeticsVpalacWorker", () => {
    let worker: EnergeticsVpalacWorker;
    let sandbox: sinon.SinonSandbox;

    const createDataStream = async () => {
        const stream = new DataSourceStream({
            objectMode: true,
            read: () => {
                return;
            },
        });

        stream.push([]);
        stream.push(null);

        return stream;
    };

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        sandbox.stub(PostgresConnector, "getConnection")
            .callsFake(() => Object.assign({ define: sandbox.stub() }));

        worker = new EnergeticsVpalacWorker();

        // Measurement
        sandbox.stub(worker["datasourceVpalacMeasurement"], "getOutputStream" as any)
            .callsFake(() => createDataStream());
        sandbox.stub(worker["datasourceVpalacMeasurement"], "getAll");
        sandbox.stub(worker["datasourceVpalacMeasurement"].protocolStrategy, "setConnectionSettings");
        sandbox.stub(worker["modelVpalacMeasurement"], "save");

        // Measuring Equipment
        sandbox.stub(worker["datasourceVpalacMeasuringEquipment"], "getOutputStream" as any)
            .callsFake(() => createDataStream());
        sandbox.stub(worker["datasourceVpalacMeasuringEquipment"], "getAll");
        sandbox.stub(worker["datasourceVpalacMeasuringEquipment"].protocolStrategy, "setConnectionSettings");
        sandbox.stub(worker["modelVpalacMeasuringEquipment"], "save");

        // Meter Type
        sandbox.stub(worker["datasourceVpalacMeterType"], "getOutputStream" as any)
            .callsFake(() => createDataStream());
        sandbox.stub(worker["datasourceVpalacMeterType"], "getAll");
        sandbox.stub(worker["datasourceVpalacMeterType"].protocolStrategy, "setConnectionSettings");
        sandbox.stub(worker["modelVpalacMeterType"], "save");

        // Type Measuring Equipment
        sandbox.stub(worker["datasourceVpalacTypeMeasuringEquipment"], "getOutputStream" as any)
            .callsFake(() => createDataStream());
        sandbox.stub(worker["datasourceVpalacTypeMeasuringEquipment"], "getAll");
        sandbox.stub(worker["datasourceVpalacTypeMeasuringEquipment"].protocolStrategy, "setConnectionSettings");
        sandbox.stub(worker["modelVpalacTypeMeasuringEquipment"], "save");

        // Units
        sandbox.stub(worker["datasourceVpalacUnits"], "getOutputStream" as any)
            .callsFake(() => createDataStream());
        sandbox.stub(worker["datasourceVpalacUnits"], "getAll");
        sandbox.stub(worker["datasourceVpalacUnits"].protocolStrategy, "setConnectionSettings");
        sandbox.stub(worker["modelVpalacUnits"], "save");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("fetchXHoursData should call fetchAndSaveData once", async () => {
        sandbox.stub(worker, "fetchAndSaveData" as any);

        await worker.fetchXHoursData({});
        sandbox.assert.calledOnce(worker["fetchAndSaveData"] as sinon.SinonSpy);
    });

    it("fetchXDaysData should call fetchAndSaveData once", async () => {
        sandbox.stub(worker, "fetchAndSaveData" as any);

        await worker.fetchXDaysData({});
        sandbox.assert.calledOnce(worker["fetchAndSaveData"] as sinon.SinonSpy);
    });

    it("fetchAndSaveData should call certain functions", async () => {
        sandbox.stub(UnimonitorCemApi, "createSession").resolves({ authCookie: "" });
        sandbox.stub(UnimonitorCemApi, "terminateSession").resolves();
        sandbox.stub(worker, "getConnectionSettings" as any).returns({ testOutput: true });
        sandbox.stub(worker, "processDataStream" as any).resolves();

        await worker["fetchAndSaveData"]({
            from: "",
            to: "",
        });

        sandbox.assert.calledOnce(UnimonitorCemApi.createSession as sinon.SinonSpy);
        sandbox.assert.calledWith(
            worker["datasourceVpalacMeasurement"].protocolStrategy.setConnectionSettings as sinon.SinonSpy,
            { testOutput: true },
        );
        sandbox.assert.calledWith(
            worker["datasourceVpalacMeasuringEquipment"].protocolStrategy.setConnectionSettings as sinon.SinonSpy,
            { testOutput: true },
        );
        sandbox.assert.calledWith(
            worker["datasourceVpalacMeterType"].protocolStrategy.setConnectionSettings as sinon.SinonSpy,
            { testOutput: true },
        );
        sandbox.assert.calledWith(
            worker["datasourceVpalacTypeMeasuringEquipment"].protocolStrategy.setConnectionSettings as sinon.SinonSpy,
            { testOutput: true },
        );
        sandbox.assert.calledWith(
            worker["datasourceVpalacUnits"].protocolStrategy.setConnectionSettings as sinon.SinonSpy,
            { testOutput: true },
        );
        sandbox.assert.callCount(worker["getConnectionSettings"] as sinon.SinonSpy, 5);
        sandbox.assert.callCount(worker["processDataStream"] as sinon.SinonSpy, 5);

    });

    it("getConnectionSettings should return settings with a cookie header", () => {
        const output = worker["getConnectionSettings"](
            "TYPE",
            "Cookie:Cookie",
        );

        expect(output.url).to.contain("TYPE");
        expect(output.headers).to.have.property("Cookie", "Cookie:Cookie");
    });
});
