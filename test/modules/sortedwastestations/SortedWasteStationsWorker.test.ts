/// <reference path="../../../node_modules/@types/node/index.d.ts" />

"use strict";

import { SortedWasteStations } from "golemio-schema-definitions";
import "mocha";
import { config } from "../../../src/core/config";
import { SortedWasteStationsWorker } from "../../../src/modules/sortedwastestations";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
const sinon = require("sinon");

chai.use(chaiAsPromised);

describe("SortedWasteStationsWorker", () => {

    let worker;
    let sandbox;
    let queuePrefix;
    let testData;
    let testTransformedData;

    beforeEach(() => {
        sandbox = sinon.createSandbox({ useFakeTimers : true });

        testData = [1, 2];
        testTransformedData = [{
            geometry: {coordinates: [0, 0]},
            properties: { accessibility: {id: 1},
                containers: [{}],
                id: 10},
            remove: sandbox.stub().resolves(true),
            save: sandbox.stub().resolves(true),
            }, {
            geometry: {coordinates: [1, 1]},
            properties: {accessibility: {id: 1},
                containers: [{}],
                id: "diakonie-broumov_zahradnickova"},
            remove: sandbox.stub().resolves(true),
            save: sandbox.stub().resolves(true),
            }, {
            geometry: {coordinates: [2, 2]},
            properties: {accessibility: {id: 1},
                containers: [{}],
                id: "potex-dolni-pocernice-2"},
            save: sandbox.stub().resolves(true),
            },
        ];

        worker = new SortedWasteStationsWorker();

        sandbox.stub(worker.iprContainersDatasource, "getAll").callsFake(() => testData);
        sandbox.stub(worker.iprStationsDatasource, "getAll").callsFake(() => testData);
        sandbox.stub(worker.oictDatasource, "getAll").callsFake(() => testData);
        sandbox.stub(worker.potexDatasource, "getAll").callsFake(() => testData);

        sandbox.stub(worker.iprTransformation, "transform").callsFake(() => testTransformedData[0]);
        sandbox.stub(worker.iprTransformation, "setContainers");
        sandbox.stub(worker.oictTransformation, "transform").callsFake(() => testTransformedData[1]);
        sandbox.stub(worker.potexTransformation, "transform").callsFake(() => testTransformedData[2]);

        sandbox.stub(worker.model, "save");
        sandbox.stub(worker, "sendMessageToExchange");
        queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + SortedWasteStations.name.toLowerCase();
        sandbox.stub(worker.model, "findOneById")
            .callsFake(() => testTransformedData[1]);
        sandbox.stub(worker, "mergeContainersIntoStations")
            .callsFake(() => [[testTransformedData[0]], [testTransformedData[1], testTransformedData[2]]]);

        sandbox.stub(worker.cityDistrictsModel, "findOne")
            .callsFake(() => Object.assign({properties: {slug: "praha-1"}}));
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by refreshDataInDB method", async () => {
        await worker.refreshDataInDB();
        sandbox.assert.calledOnce(worker.iprContainersDatasource.getAll);
        sandbox.assert.calledOnce(worker.iprStationsDatasource.getAll);
        sandbox.assert.calledOnce(worker.oictDatasource.getAll);
        sandbox.assert.calledOnce(worker.oictDatasource.getAll);
        sandbox.assert.calledOnce(worker.iprTransformation.setContainers);
        sandbox.assert.calledOnce(worker.iprTransformation.transform);
        sandbox.assert.calledOnce(worker.oictTransformation.transform);
        sandbox.assert.calledOnce(worker.potexTransformation.transform);
        sandbox.assert.calledOnce(worker.model.save);
        testTransformedData.map((f) => {
            sandbox.assert.calledWith(worker.sendMessageToExchange,
                "workers." + queuePrefix + ".updateDistrict",
                new Buffer(JSON.stringify(f)));
        });
        sandbox.assert.callOrder(
            worker.iprContainersDatasource.getAll,
            worker.iprStationsDatasource.getAll,
            worker.oictDatasource.getAll,
            worker.potexDatasource.getAll,
            worker.iprTransformation.setContainers,
            worker.iprTransformation.transform,
            worker.oictTransformation.transform,
            worker.potexTransformation.transform,
            worker.model.save,
            worker.sendMessageToExchange);
    });

    it("should calls the correct methods by updateDistrict method (different geo)", async () => {
        await worker.updateDistrict({content: new Buffer(JSON.stringify(testTransformedData[0]))});
        sandbox.assert.calledOnce(worker.model.findOneById);
        sandbox.assert.calledWith(worker.model.findOneById, testTransformedData[0].properties.id);

        sandbox.assert.calledOnce(worker.cityDistrictsModel.findOne);
        sandbox.assert.calledOnce(testTransformedData[1].save);
        sandbox.assert.notCalled(testTransformedData[1].remove);
    });

    it("should calls the correct methods by updateDistrict method (same geo)", async () => {
        testTransformedData[1] = {
            geometry: {coordinates: [0, 0]},
            properties: {
                address: "a",
                district: "praha-0",
                id: 1},
            remove: sandbox.stub().resolves(true),
            save: sandbox.stub().resolves(true),
        };
        await worker.updateDistrict({content: new Buffer(JSON.stringify(testTransformedData[0]))});
        sandbox.assert.calledOnce(worker.model.findOneById);
        sandbox.assert.calledWith(worker.model.findOneById, testTransformedData[0].properties.id);

        sandbox.assert.notCalled(worker.cityDistrictsModel.findOne);
        sandbox.assert.notCalled(testTransformedData[1].save);
        sandbox.assert.notCalled(testTransformedData[1].remove);
    });

});
