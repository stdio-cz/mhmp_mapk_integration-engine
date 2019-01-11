/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import { Parkings } from "data-platform-schema-definitions";
import "mocha";
import GeocodeApi from "../../src/helpers/GeocodeApi";
import ParkingsWorker from "../../src/workers/ParkingsWorker";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
const sinon = require("sinon");

chai.use(chaiAsPromised);

const config = require("../../src/config/ConfigLoader");

describe("ParkingsWorker", () => {

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
        testTransformedData = { features: [1, 2], type: "" };
        testTransformedHistoryData = [1, 2];
        data0 = {properties: {id: 0}, geometry: {coordinates: [0, 0]}};
        data1 = {properties: {id: 1}, geometry: {coordinates: [1, 1]}, save: sandbox.stub().resolves(true)};

        worker = new ParkingsWorker();

        sandbox.stub(worker.dataSource, "GetAll")
            .callsFake(() => testData);
        sandbox.stub(worker.transformation, "TransformDataCollection")
            .callsFake(() => testTransformedData);
        sandbox.stub(worker.model, "SaveToDb");
        sandbox.stub(worker.historyTransformation, "TransformDataCollection")
            .callsFake(() => testTransformedHistoryData);
        sandbox.stub(worker.historyModel, "SaveToDb");
        sandbox.stub(worker.historyModel, "GetAverageTakenPlacesById");
        sandbox.stub(worker, "sendMessageToExchange");
        queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + Parkings.name.toLowerCase();
        sandbox.stub(worker.model, "GetOneFromModel")
            .callsFake(() => data1);

        sandbox.stub(worker.cityDistrictsModel, "GetDistrictByCoordinations");
        sandbox.stub(GeocodeApi, "getAddressByLatLng");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by refreshDataInDB method", async () => {
        await worker.refreshDataInDB();
        sandbox.assert.calledOnce(worker.dataSource.GetAll);
        sandbox.assert.calledOnce(worker.transformation.TransformDataCollection);
        sandbox.assert.calledWith(worker.transformation.TransformDataCollection, testData);
        sandbox.assert.calledOnce(worker.model.SaveToDb);
        sandbox.assert.calledWith(worker.model.SaveToDb, testTransformedData);
        sandbox.assert.callCount(worker.sendMessageToExchange, 5);
        sandbox.assert.calledWith(worker.sendMessageToExchange,
            "workers." + queuePrefix + ".saveDataToHistory",
            JSON.stringify(testTransformedData.features));
        testTransformedData.features.map((f) => {
            sandbox.assert.calledWith(worker.sendMessageToExchange,
                "workers." + queuePrefix + ".updateAddressAndDistrict",
                JSON.stringify(f));
            sandbox.assert.calledWith(worker.sendMessageToExchange,
                "workers." + queuePrefix + ".updateAverageOccupancy",
                JSON.stringify(f));
        });
        sandbox.assert.callOrder(
            worker.dataSource.GetAll,
            worker.transformation.TransformDataCollection,
            worker.model.SaveToDb,
            worker.sendMessageToExchange);
    });

    it("should calls the correct methods by saveDataToHistory method", async () => {
        await worker.saveDataToHistory(testTransformedData);
        sandbox.assert.calledOnce(worker.historyTransformation.TransformDataCollection);
        sandbox.assert.calledWith(worker.historyTransformation.TransformDataCollection, testTransformedData);
        sandbox.assert.calledOnce(worker.historyModel.SaveToDb);
        sandbox.assert.calledWith(worker.historyModel.SaveToDb, testTransformedHistoryData);
        sandbox.assert.callOrder(
            worker.historyTransformation.TransformDataCollection,
            worker.historyModel.SaveToDb,
        );
    });

    it("should calls the correct methods by updateAddressAndDistrict method (different geo)", async () => {
        await worker.updateAddressAndDistrict(data0);
        sandbox.assert.calledOnce(worker.model.GetOneFromModel);
        sandbox.assert.calledWith(worker.model.GetOneFromModel, data0.properties.id);

        sandbox.assert.calledOnce(worker.cityDistrictsModel.GetDistrictByCoordinations);
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
        await worker.updateAddressAndDistrict(data0);
        sandbox.assert.calledOnce(worker.model.GetOneFromModel);
        sandbox.assert.calledWith(worker.model.GetOneFromModel, data0.properties.id);

        sandbox.assert.notCalled(worker.cityDistrictsModel.GetDistrictByCoordinations);
        sandbox.assert.notCalled(GeocodeApi.getAddressByLatLng);
        sandbox.assert.notCalled(data1.save);
    });

    it("should calls the correct methods by updateAverageOccupancy method", async () => {
        await worker.updateAverageOccupancy(data0);
        sandbox.assert.calledOnce(worker.model.GetOneFromModel);
        sandbox.assert.calledWith(worker.model.GetOneFromModel, data0.properties.id);
        sandbox.assert.calledOnce(worker.historyModel.GetAverageTakenPlacesById);
        sandbox.assert.calledOnce(data1.save);
    });

});
