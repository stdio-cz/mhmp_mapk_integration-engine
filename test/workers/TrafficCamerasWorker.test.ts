/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import { TrafficCameras } from "data-platform-schema-definitions";
import "mocha";
import GeocodeApi from "../../src/helpers/GeocodeApi";
import TrafficCamerasWorker from "../../src/workers/TrafficCamerasWorker";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
const sinon = require("sinon");

chai.use(chaiAsPromised);

const config = require("../../src/config/ConfigLoader");

describe("TrafficCamerasWorker", () => {

    let worker;
    let sandbox;
    let queuePrefix;
    let testData;
    let testTransformedData;
    let testTransformedHistoryData;
    let data0;
    let data1;

    beforeEach(() => {
        sandbox = sinon.createSandbox({ useFakeTimers : true });

        testData = [1, 2];
        testTransformedData = [1, 2];
        testTransformedHistoryData = [1, 2];
        data0 = {properties: {id: 0}, geometry: {coordinates: [0, 0]}};
        data1 = {properties: {id: 1}, geometry: {coordinates: [1, 1]}, save: sandbox.stub().resolves(true)};

        worker = new TrafficCamerasWorker();

        sandbox.stub(worker.dataSource, "getAll")
            .callsFake(() => testData);
        sandbox.stub(worker.transformation, "transform")
            .callsFake(() => testTransformedData);
        sandbox.stub(worker.model, "save");
        sandbox.stub(worker.historyTransformation, "transform")
            .callsFake(() => testTransformedHistoryData);
        sandbox.stub(worker.historyModel, "save");
        sandbox.stub(worker, "sendMessageToExchange");
        queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + TrafficCameras.name.toLowerCase();
        sandbox.stub(worker.model, "findOneById")
            .callsFake(() => data1);

        sandbox.stub(worker.cityDistrictsModel, "findOne");
        sandbox.stub(GeocodeApi, "getAddressByLatLng");
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
        sandbox.assert.calledThrice(worker.sendMessageToExchange);
        sandbox.assert.calledWith(worker.sendMessageToExchange,
            "workers." + queuePrefix + ".saveDataToHistory",
            new Buffer(JSON.stringify(testTransformedData)));
        testTransformedData.map((f) => {
            sandbox.assert.calledWith(worker.sendMessageToExchange,
                "workers." + queuePrefix + ".updateAddressAndDistrict",
                new Buffer(JSON.stringify(f)));
        });
        sandbox.assert.callOrder(
            worker.dataSource.getAll,
            worker.transformation.transform,
            worker.model.save,
            worker.sendMessageToExchange);
    });

    it("should calls the correct methods by saveDataToHistory method", async () => {
        await worker.saveDataToHistory({content: new Buffer(JSON.stringify(testTransformedData))});
        sandbox.assert.calledOnce(worker.historyTransformation.transform);
        sandbox.assert.calledWith(worker.historyTransformation.transform, testTransformedData);
        sandbox.assert.calledOnce(worker.historyModel.save);
        sandbox.assert.calledWith(worker.historyModel.save, testTransformedHistoryData);
        sandbox.assert.callOrder(
            worker.historyTransformation.transform,
            worker.historyModel.save,
        );
    });

    it("should calls the correct methods by updateAddressAndDistrict method (different geo)", async () => {
        await worker.updateAddressAndDistrict({content: new Buffer(JSON.stringify(data0))});
        sandbox.assert.calledOnce(worker.model.findOneById);
        sandbox.assert.calledWith(worker.model.findOneById, data0.properties.id);

        sandbox.assert.calledOnce(worker.cityDistrictsModel.findOne);
        sandbox.assert.calledOnce(GeocodeApi.getAddressByLatLng);
        sandbox.assert.calledTwice(data1.save);
    });

    it("should calls the correct methods by updateAddressAndDistrict method (same geo)", async () => {
        data1 = {
            geometry: {coordinates: [0, 0]},
            properties: {
                address: "a",
                district: "praha-0",
                id: 1},
            save: sandbox.stub().resolves(true),
        };
        await worker.updateAddressAndDistrict({content: new Buffer(JSON.stringify(data0))});
        sandbox.assert.calledOnce(worker.model.findOneById);
        sandbox.assert.calledWith(worker.model.findOneById, data0.properties.id);

        sandbox.assert.notCalled(worker.cityDistrictsModel.findOne);
        sandbox.assert.notCalled(GeocodeApi.getAddressByLatLng);
        sandbox.assert.notCalled(data1.save);
    });

});
