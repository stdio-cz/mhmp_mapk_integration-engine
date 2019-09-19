"use strict";

import { Parkings } from "@golemio/schema-definitions";
import "mocha";
import * as sinon from "sinon";
import { config } from "../../../src/core/config";
import { PostgresConnector } from "../../../src/core/connectors";
import { GeocodeApi } from "../../../src/core/helpers";
import { ParkingsWorker } from "../../../src/modules/parkings";

describe("ParkingsWorker", () => {

    let worker;
    let sandbox;
    let queuePrefix;
    let testData;
    let testTransformedData;
    let testTransformedHistoryData;
    let data0;
    let data1;
    let testOccData;
    let testTransformedOccData;

    beforeEach(() => {
        sandbox = sinon.createSandbox({ useFakeTimers : true });

        testData = [1, 2];
        testTransformedData = [1, 2];
        testTransformedHistoryData = [1, 2];
        data0 = {properties: {id: 0}, geometry: {coordinates: [0, 0]}};
        data1 = {properties: {id: 1}, geometry: {coordinates: [1, 1]}, save: sandbox.stub().resolves(true)};
        testOccData = { gpreservation: { zoneinfo: { zonei: {
                        capacity: "633", name: "Parkoviště", occupation: "178", reservedcapacity: "0",
                        reservedoccupation: "0",
                    } } },
        };
        testTransformedOccData = {
            capacity: 633, occupation: 178, parking_id: 534016, reservedcapacity: 0, reservedoccupation: 0,
        };

        sandbox.stub(PostgresConnector, "getConnection")
            .callsFake(() => Object.assign({
                define: sandbox.stub().callsFake(() => ({})),
                transaction: sandbox.stub().callsFake(() => Object.assign({commit: sandbox.stub()})),
            }));

        worker = new ParkingsWorker();

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
        queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + Parkings.name.toLowerCase();
        sandbox.stub(worker.model, "findOneById")
            .callsFake(() => data1);

        sandbox.stub(worker.cityDistrictsModel, "findOne");
        sandbox.stub(GeocodeApi, "getAddressByLatLng");

        sandbox.stub(worker.occupanciesTransformation, "transform")
            .callsFake(() => testTransformedOccData);
        sandbox.stub(worker.occupanciesModel, "save");
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
        sandbox.assert.callCount(worker.sendMessageToExchange, 5);
        sandbox.assert.calledWith(worker.sendMessageToExchange,
            "workers." + queuePrefix + ".saveDataToHistory",
            new Buffer(JSON.stringify(testTransformedData)));
        testTransformedData.map((f) => {
            sandbox.assert.calledWith(worker.sendMessageToExchange,
                "workers." + queuePrefix + ".updateAddressAndDistrict",
                new Buffer(JSON.stringify(f)));
            sandbox.assert.calledWith(worker.sendMessageToExchange,
                "workers." + queuePrefix + ".updateAverageOccupancy",
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
                address: { address_formatted: "a" },
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

    it("should calls the correct methods by updateAverageOccupancy method", async () => {
        await worker.updateAverageOccupancy({content: new Buffer(JSON.stringify(data0))});
        sandbox.assert.calledOnce(worker.model.findOneById);
        sandbox.assert.calledWith(worker.model.findOneById, data0.properties.id);
        sandbox.assert.calledOnce(worker.historyModel.aggregate);
        sandbox.assert.calledOnce(data1.save);
    });

    it("should calls the correct methods by saveOccupanciesToDB method", async () => {
        await worker.saveOccupanciesToDB({content: new Buffer(JSON.stringify(testOccData))});
        sandbox.assert.calledOnce(worker.occupanciesTransformation.transform);
        sandbox.assert.calledOnce(worker.occupanciesModel.save);
        sandbox.assert.callOrder(
            worker.occupanciesTransformation.transform,
            worker.occupanciesModel.save);
    });

});
