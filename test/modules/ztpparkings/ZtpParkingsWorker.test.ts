"use strict";

import { ZtpParkings } from "@golemio/schema-definitions";
import "mocha";
import * as sinon from "sinon";
import { config } from "../../../src/core/config";
import { GeocodeApi } from "../../../src/core/helpers";
import { ZtpParkingsWorker } from "../../../src/modules/ztpparkings";

describe("ZtpParkingsWorker", () => {

    let worker;
    let sandbox;
    let queuePrefix;
    let testData;
    let testTransformedData;
    let testTransformedHistoryData;
    let data0;
    let data1;
    let testInputData;
    let testTransformedInputData;

    beforeEach(() => {
        sandbox = sinon.createSandbox({ useFakeTimers: true });

        testData = [1, 2];
        testTransformedData = [1, 2];
        testTransformedHistoryData = [1, 2];
        data0 = { properties: { id: 0 }, geometry: { coordinates: [0, 0] } };
        data1 = { properties: { id: 1 }, geometry: { coordinates: [1, 1] }, save: sandbox.stub().resolves(true) };
        testInputData = {
            device: "205A4A",
            id: 5,
            last_updated: "2019-06-17 12:25:04",
            status: 1,
        };
        testTransformedInputData = {
            properties: {
                device_id: "205A4A", failure: false, id: 5, last_updated_at: 1560767104000, occupied: true,
            },
        };

        worker = new ZtpParkingsWorker();

        sandbox.stub(worker.dataSource, "getAll")
            .callsFake(() => testData);
        sandbox.stub(worker.transformation, "transform")
            .callsFake(() => testTransformedData);
        sandbox.stub(worker.transformation, "transformHistory")
            .callsFake(() => testTransformedHistoryData);
        sandbox.stub(worker.model, "save");
        sandbox.stub(worker.historyModel, "save");
        sandbox.stub(worker.historyModel, "aggregate")
            .callsFake(() => []);
        sandbox.stub(worker, "sendMessageToExchange");
        queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + ZtpParkings.name.toLowerCase();
        sandbox.stub(worker.model, "findOneById")
            .callsFake(() => data1);

        sandbox.stub(worker.cityDistrictsModel, "findOne");
        sandbox.stub(GeocodeApi, "getAddressByLatLng");

        sandbox.stub(worker.inputTransformation, "transform")
            .callsFake(() => testTransformedInputData);
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by refreshDataInDB method", async () => {
        await worker.refreshDataInDB();
        sandbox.assert.calledOnce(worker.dataSource.getAll);
        sandbox.assert.calledOnce(worker.transformation.transform);
        sandbox.assert.calledWith(worker.transformation.transform, testData);
        sandbox.assert.calledOnce(worker.model.save);
        sandbox.assert.calledWith(worker.model.save, testTransformedHistoryData);
        sandbox.assert.callCount(worker.sendMessageToExchange, 3);
        sandbox.assert.calledWith(worker.sendMessageToExchange,
            "workers." + queuePrefix + ".saveDataToHistory",
            JSON.stringify(testTransformedData));
        testTransformedData.map((f) => {
            sandbox.assert.calledWith(worker.sendMessageToExchange,
                "workers." + queuePrefix + ".updateAddressAndDistrict",
                JSON.stringify(f));
        });
        sandbox.assert.callOrder(
            worker.dataSource.getAll,
            worker.transformation.transform,
            worker.model.save,
            worker.sendMessageToExchange);
    });

    it("should calls the correct methods by saveDataToHistory method", async () => {
        await worker.saveDataToHistory({ content: Buffer.from(JSON.stringify(testTransformedData)) });
        sandbox.assert.calledOnce(worker.transformation.transformHistory);
        sandbox.assert.calledWith(worker.transformation.transformHistory, testTransformedData);
        sandbox.assert.calledOnce(worker.historyModel.save);
        sandbox.assert.calledWith(worker.historyModel.save, testTransformedHistoryData);
        sandbox.assert.callOrder(
            worker.transformation.transformHistory,
            worker.historyModel.save,
        );
    });

    it("should calls the correct methods by updateAddressAndDistrict method (different geo)", async () => {
        await worker.updateAddressAndDistrict({ content: Buffer.from(JSON.stringify(data0)) });
        sandbox.assert.calledOnce(worker.model.findOneById);
        sandbox.assert.calledWith(worker.model.findOneById, data0.properties.id);

        sandbox.assert.calledOnce(worker.cityDistrictsModel.findOne);
        sandbox.assert.calledOnce(GeocodeApi.getAddressByLatLng);
        sandbox.assert.calledTwice(data1.save);
    });

    it("should calls the correct methods by updateAddressAndDistrict method (same geo)", async () => {
        data1 = {
            geometry: { coordinates: [0, 0] },
            properties: {
                address: { address_formatted: "a" },
                district: "praha-0",
                id: 1,
            },
            save: sandbox.stub().resolves(true),
        };
        await worker.updateAddressAndDistrict({ content: Buffer.from(JSON.stringify(data0)) });
        sandbox.assert.calledOnce(worker.model.findOneById);
        sandbox.assert.calledWith(worker.model.findOneById, data0.properties.id);

        sandbox.assert.notCalled(worker.cityDistrictsModel.findOne);
        sandbox.assert.notCalled(GeocodeApi.getAddressByLatLng);
        sandbox.assert.notCalled(data1.save);
    });

    it("should calls the correct methods by updateStatusAndDevice method", async () => {
        await worker.updateStatusAndDevice({ content: Buffer.from(JSON.stringify(testInputData)) });
        sandbox.assert.calledOnce(worker.inputTransformation.transform);

        sandbox.assert.calledOnce(worker.model.findOneById);
        sandbox.assert.calledWith(worker.model.findOneById, testTransformedInputData.properties.id);

        sandbox.assert.calledOnce(data1.save);
        sandbox.assert.callOrder(
            worker.inputTransformation.transform,
            worker.model.findOneById,
            data1.save);
    });

});
