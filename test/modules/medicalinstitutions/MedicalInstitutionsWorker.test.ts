"use strict";

import { MedicalInstitutions } from "@golemio/schema-definitions";
import "mocha";
import * as sinon from "sinon";
import { config } from "../../../src/core/config";
import { RedisConnector } from "../../../src/core/connectors";
import { GeocodeApi } from "../../../src/core/helpers";
import { MedicalInstitutionsWorker } from "../../../src/modules/medicalinstitutions";

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
        sandbox.stub(RedisConnector, "getConnection");

        testData = [{data: 1, filepath: 11}, {data: 2, filepath: 22}];
        testTransformedData = [1, 2];
        data0 = {properties: {id: 0}, geometry: {coordinates: [0, 0]}};
        data1 = {geometry: {coordinates: [0, 0]}, properties: {address:
            {city: "Praha 10", street: "V Olšinách 449/41"}, id: 1}, save: sandbox.stub().resolves(true)};

        worker = new MedicalInstitutionsWorker();

        sandbox.stub(worker.pharmaciesDatasource, "getAll")
            .callsFake(() => testData);
        sandbox.stub(worker.pharmaciesTransformation, "transform")
            .callsFake(() => testTransformedData);
        sandbox.stub(worker.healthCareDatasource, "getAll")
            .callsFake(() => testData);
        sandbox.stub(worker.healthCareTransformation, "transform")
            .callsFake(() => testTransformedData);
        sandbox.stub(worker.redisModel, "getData")
            .callsFake(() => testData[0].data);
        sandbox.stub(worker.model, "save");
        sandbox.stub(worker.model, "updateOneById");
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
        sandbox.assert.calledOnce(worker.pharmaciesDatasource.getAll);
        sandbox.assert.calledOnce(worker.pharmaciesTransformation.transform);
        sandbox.assert.calledWith(worker.pharmaciesTransformation.transform, testData);
        sandbox.assert.calledOnce(worker.healthCareDatasource.getAll);
        sandbox.assert.calledOnce(worker.healthCareTransformation.transform);
        sandbox.assert.calledWith(worker.healthCareTransformation.transform, testData);
        sandbox.assert.calledOnce(worker.model.save);
        sandbox.assert.callCount(worker.sendMessageToExchange, 4);
        testTransformedData.map((f) => {
            sandbox.assert.calledWith(worker.sendMessageToExchange,
                "workers." + queuePrefix + ".updateGeoAndDistrict",
                JSON.stringify(f));
        });
        sandbox.assert.callOrder(
            worker.pharmaciesDatasource.getAll,
            worker.pharmaciesTransformation.transform,
            worker.healthCareDatasource.getAll,
            worker.healthCareTransformation.transform,
            worker.model.save,
            worker.sendMessageToExchange);
    });

    it("should calls the correct methods by updateGeoAndDistrict method (different geo)", async () => {
        await worker.updateGeoAndDistrict({content: Buffer.from(JSON.stringify(data0))});
        sandbox.assert.calledOnce(worker.model.findOneById);
        sandbox.assert.calledWith(worker.model.findOneById, data0.properties.id);

        sandbox.assert.calledOnce(worker.cityDistrictsModel.findOne);
        sandbox.assert.calledOnce(GeocodeApi.getGeoByAddress);
        sandbox.assert.calledOnce(data1.save);
        sandbox.assert.calledOnce(worker.model.updateOneById);
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
        await worker.updateGeoAndDistrict({content: Buffer.from(JSON.stringify(data0))});
        sandbox.assert.calledOnce(worker.model.findOneById);
        sandbox.assert.calledWith(worker.model.findOneById, data0.properties.id);

        sandbox.assert.calledOnce(worker.cityDistrictsModel.findOne);
        sandbox.assert.notCalled(GeocodeApi.getGeoByAddress);
        sandbox.assert.notCalled(data1.save);
    });

});
