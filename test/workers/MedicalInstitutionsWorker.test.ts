/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import { MedicalInstitutions } from "data-platform-schema-definitions";
import "mocha";
import GeocodeApi from "../../src/helpers/GeocodeApi";
import MedicalInstitutionsWorker from "../../src/workers/MedicalInstitutionsWorker";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
const sinon = require("sinon");

chai.use(chaiAsPromised);

const config = require("../../src/config/ConfigLoader");

describe("MedicalInstitutionsWorker", () => {

    let worker;
    let sandbox;
    let queuePrefix;
    let testData;
    let testTransformedData;
    let data0;
    let data1;

    beforeEach(() => {
        sandbox = sinon.createSandbox({ useFakeTimers : true });

        testData = [{data: 1, filepath: 11}, {data: 2, filepath: 22}];
        testTransformedData = [1, 2];
        data0 = {properties: {id: 0}, geometry: {coordinates: [0, 0]}};
        data1 = {geometry: {coordinates: [0, 0]}, properties: {address:
            {city: "Praha 10", street: "V Olšinách 449/41"}, id: 1}, save: sandbox.stub().resolves(true)};

        worker = new MedicalInstitutionsWorker();

        sandbox.stub(worker.dataSource, "getAll")
            .callsFake(() => testData);
        sandbox.stub(worker, "readFile")
            .callsFake(() => testData[0].data);
        sandbox.stub(worker.transformation, "transform")
            .callsFake(() => testTransformedData);
        sandbox.stub(worker.model, "save");
        sandbox.stub(worker.model, "update");
        sandbox.stub(worker, "sendMessageToExchange");
        queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + MedicalInstitutions.name.toLowerCase();
        sandbox.stub(worker.model, "findOneById")
            .callsFake(() => data1);

        sandbox.stub(worker.cityDistrictsModel, "findOne");
        sandbox.stub(GeocodeApi, "getGeoByAddress");
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
        sandbox.assert.calledTwice(worker.sendMessageToExchange);
        testTransformedData.map((f) => {
            sandbox.assert.calledWith(worker.sendMessageToExchange,
                "workers." + queuePrefix + ".updateGeoAndDistrict",
                new Buffer(JSON.stringify(f)));
        });
        sandbox.assert.callOrder(
            worker.dataSource.getAll,
            worker.transformation.transform,
            worker.model.save,
            worker.sendMessageToExchange);
    });

    it("should calls the correct methods by updateGeoAndDistrict method (different geo)", async () => {
        await worker.updateGeoAndDistrict({content: new Buffer(JSON.stringify(data0))});
        sandbox.assert.calledOnce(worker.model.findOneById);
        sandbox.assert.calledWith(worker.model.findOneById, data0.properties.id);

        sandbox.assert.calledOnce(worker.cityDistrictsModel.findOne);
        sandbox.assert.calledOnce(GeocodeApi.getGeoByAddress);
        sandbox.assert.calledOnce(data1.save);
        sandbox.assert.calledOnce(worker.model.update);
    });

    it("should calls the correct methods by updateGeoAndDistrict method (same geo)", async () => {
        data1 = {
            geometry: {coordinates: [1, 1]},
            properties: {
                address: "a",
                district: "praha-0",
                id: 1},
            save: sandbox.stub().resolves(true),
        };
        await worker.updateGeoAndDistrict({content: new Buffer(JSON.stringify(data0))});
        sandbox.assert.calledOnce(worker.model.findOneById);
        sandbox.assert.calledWith(worker.model.findOneById, data0.properties.id);

        sandbox.assert.calledOnce(worker.cityDistrictsModel.findOne);
        sandbox.assert.notCalled(GeocodeApi.getGeoByAddress);
        sandbox.assert.notCalled(data1.save);
    });

});
