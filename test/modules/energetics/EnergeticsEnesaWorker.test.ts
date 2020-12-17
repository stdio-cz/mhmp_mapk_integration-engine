"use strict";

import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import * as sinon from "sinon";
import { DataSourceStream } from "../../../src/core/datasources";
import { PostgresConnector } from "../../../src/core/connectors";
import { EnergeticsEnesaWorker } from "../../../src/modules/energetics";

chai.use(chaiAsPromised);

describe("EnergeticsEnesaWorker", () => {
    let worker: EnergeticsEnesaWorker;
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

        worker = new EnergeticsEnesaWorker();

        // Energy Buildings
        sandbox.stub(worker["datasourceEnesaEnergyBuildings"], "getOutputStream" as any)
            .callsFake(() => createDataStream());
        sandbox.stub(worker["datasourceEnesaEnergyBuildings"], "getAll");
        sandbox.stub(worker["datasourceEnesaEnergyBuildings"].protocolStrategy, "setConnectionSettings");
        sandbox.stub(worker["modelEnesaEnergyBuildings"], "save");

        // Energy Consumption
        sandbox.stub(worker["datasourceEnesaEnergyConsumption"], "getOutputStream" as any)
            .callsFake(() => createDataStream());
        sandbox.stub(worker["datasourceEnesaEnergyConsumption"], "getAll");
        sandbox.stub(worker["datasourceEnesaEnergyConsumption"].protocolStrategy, "setConnectionSettings");
        sandbox.stub(worker["datasourceEnesaEnergyConsumptionVisapp"], "getOutputStream" as any)
            .callsFake(() => createDataStream());
        sandbox.stub(worker["datasourceEnesaEnergyConsumptionVisapp"], "getAll");
        sandbox.stub(worker["datasourceEnesaEnergyConsumptionVisapp"].protocolStrategy, "setConnectionSettings");
        sandbox.stub(worker["modelEnesaEnergyConsumption"], "save");

        // Enesa Energy Devices
        sandbox.stub(worker["datasourceEnesaEnergyDevices"], "getOutputStream" as any)
            .callsFake(() => createDataStream());
        sandbox.stub(worker["datasourceEnesaEnergyDevices"], "getAll");
        sandbox.stub(worker["datasourceEnesaEnergyDevices"].protocolStrategy, "setConnectionSettings");
        sandbox.stub(worker["modelEnesaEnergyDevices"], "save");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("fetchXDaysData should call fetchAndSaveData once", async () => {
        sandbox.stub(worker, "fetchAndSaveData" as any);

        await worker.fetchXDaysData({});
        sandbox.assert.calledOnce(worker["fetchAndSaveData"] as sinon.SinonSpy);
    });

    it("fetchAndSaveData should call certain functions", async () => {
        sandbox.stub(worker, "getConnectionSettings" as any).returns({ testOutput: true });
        sandbox.stub(worker, "processDataStream" as any).resolves();

        await worker["fetchAndSaveData"]({
            from: "",
            to: "",
        });

        sandbox.assert.calledWith(
            worker["datasourceEnesaEnergyBuildings"].protocolStrategy.setConnectionSettings as sinon.SinonSpy,
            { testOutput: true },
        );
        sandbox.assert.calledWith(
            worker["datasourceEnesaEnergyConsumption"].protocolStrategy.setConnectionSettings as sinon.SinonSpy,
            { testOutput: true },
        );
        sandbox.assert.calledWith(
            worker["datasourceEnesaEnergyConsumptionVisapp"].protocolStrategy.setConnectionSettings as sinon.SinonSpy,
            { testOutput: true },
        );
        sandbox.assert.calledWith(
            worker["datasourceEnesaEnergyDevices"].protocolStrategy.setConnectionSettings as sinon.SinonSpy,
            { testOutput: true },
        );
        sandbox.assert.callCount(worker["getConnectionSettings"] as sinon.SinonSpy, 4);
        sandbox.assert.callCount(worker["processDataStream"] as sinon.SinonSpy, 4);

    });

    it("getConnectionSettings should return settings with a correct url", () => {
        const output = worker["getConnectionSettings"](
            "TYPE",
            { from: "X", to: "X" },
        );

        expect(output.url).to.contain("/TYPE?from=X&to=X");
    });
});
