"use strict";

import { CustomError } from "@golemio/errors";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import * as sinon from "sinon";
import { DataSourceStream } from "../../../src/core/datasources";
import { PostgresConnector } from "../../../src/core/connectors";
import { EnergeticsWorker, UnimonitorCemApi } from "../../../src/modules/energetics";

chai.use(chaiAsPromised);

describe("EnergeticsWorker", () => {
    let worker: EnergeticsWorker;
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

        worker = new EnergeticsWorker();

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

    it("fetchVpalac1HourData should call saveVpalacDataToDB once", async () => {
        sandbox.stub(worker, "saveVpalacDataToDB" as any);

        await worker.fetchVpalac1HourData({});

        sandbox.assert.calledOnce(worker["saveVpalacDataToDB"] as sinon.SinonSpy);
    });

    it("fetchVpalac1HourData should call saveVpalacDataToDB once", async () => {
        sandbox.stub(worker, "saveVpalacDataToDB" as any);

        await worker.fetchVpalac1HourData({});

        sandbox.assert.calledOnce(worker["saveVpalacDataToDB"] as sinon.SinonSpy);
    });

    it("saveVpalacDataToDB should call certain functions", async () => {
        sandbox.stub(UnimonitorCemApi, "createSession").resolves({ authCookie: "" });
        sandbox.stub(UnimonitorCemApi, "terminateSession").resolves();
        sandbox.stub(worker, "getVpalacConnectionSettings" as any).returns({ testOutput: true });
        sandbox.stub(worker, "proceedVpalacDataStream" as any).resolves();

        await worker["saveVpalacDataToDB"]({
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
        sandbox.assert.callCount(worker["getVpalacConnectionSettings"] as sinon.SinonSpy, 5);
        sandbox.assert.callCount(worker["proceedVpalacDataStream"] as sinon.SinonSpy, 5);

    });

    it("proceedVpalacDataStream should resolve", async () => {
        const dataStream =  new DataSourceStream({
            objectMode: true,
            read: () => {
                return;
            },
        });

        sandbox.stub(dataStream, "proceed").resolves();

        const promise = worker["proceedVpalacDataStream"](
            Promise.resolve(dataStream),
            (data: any) => Promise.resolve(),
        );

        expect(await promise).to.be.undefined;
    });

    it("proceedVpalacDataStream should reject (datasource error)", async () => {
        const dataStream =  new DataSourceStream({
            objectMode: true,
            read: () => {
                return;
            },
        });

        sandbox.stub(dataStream, "proceed").resolves();

        const promise = worker["proceedVpalacDataStream"](
            Promise.reject(dataStream),
            (data: any) => Promise.resolve(),
        );

        await expect(promise).to.be.rejectedWith(CustomError);
    });

    it("proceedVpalacDataStream should reject (data processor error)", async () => {
        const dataStream =  new DataSourceStream({
            objectMode: true,
            read: () => {
                return;
            },
        });

        sandbox.stub(dataStream, "proceed").rejects();

        const promise = worker["proceedVpalacDataStream"](
            Promise.resolve(dataStream),
            (data: any) => Promise.resolve(),
        );

        await expect(promise).to.be.rejectedWith(CustomError);
    });

    it("getVpalacConnectionSettings should return settings with a cookie header", () => {
        const output = worker["getVpalacConnectionSettings"](
            "TYPE",
            "Cookie:Cookie",
        );

        expect(output.url).to.contain("TYPE");
        expect(output.headers).to.have.property("Cookie", "Cookie:Cookie");
    });
});
