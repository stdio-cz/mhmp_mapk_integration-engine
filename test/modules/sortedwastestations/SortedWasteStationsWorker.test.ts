"use strict";

import { SortedWasteStations } from "@golemio/schema-definitions";
import "mocha";
import * as sinon from "sinon";
import { config } from "../../../src/core/config";
import { SortedWasteStationsWorker } from "../../../src/modules/sortedwastestations";

describe("SortedWasteStationsWorker", () => {

    let worker;
    let sandbox;
    let queuePrefix;
    let testData;
    let testTransformedData;
    let testSensorContainersData;
    let testSensorMeasurementData;
    let testSensorPicksData;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        testData = [1, 2];
        testTransformedData = [{
            geometry: {coordinates: [0, 0]},
            properties: { accessibility: {id: 1},
                containers: [{
                    sensor_code: "0006/ 263C00231",
                    sensor_container_id: 29823,
                    sensor_supplier: "Sensoneo",
                    trash_type: {id: 6},
                }],
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
        testSensorContainersData = [{
            address: "Nad Úžlabinou 708",
            bin_type: "Schäfer/Europa-OV",
            code: "0010/ 268C00462",
            id: 29823,
            latitude: 50.08035899999999,
            longitude: 14.49945600000001,
            trash_type: "plastic",
        }];
        testSensorMeasurementData = [{
            battery_status: 3.6,
            code: "0006/ 263C00231",
            container_id: 29823,
            firealarm: 0,
            id: 12536378,
            measured_at_utc: "1557806982000",
            percent_calculated: 56,
            prediction_utc: "1557806982000",
            temperature: 10,
            updated_at: 1559737670311,
            upturned: 0,
        }];
        testSensorPicksData = [{
            code: "0001/ 038C00042",
            container_id: 29823,
            decrease: 20,
            event_driven: false,
            id: 12495474,
            percent_before: 100,
            percent_now: 10,
            pick_at_utc: "1557806982000",
            pick_minfilllevel: 30,
            updated_at: 1559737670311,
        }];

        worker = new SortedWasteStationsWorker();

        sandbox.stub(worker.iprContainersDatasource, "getAll").callsFake(() => testData);
        sandbox.stub(worker.iprStationsDatasource, "getAll").callsFake(() => testData);
        sandbox.stub(worker.oictDatasource, "getAll").callsFake(() => testData);
        sandbox.stub(worker.potexDatasource, "getAll").callsFake(() => testData);

        sandbox.stub(worker.iprTransformation, "transform").callsFake(() => testTransformedData[0]);
        sandbox.stub(worker.iprTransformation, "setContainers");
        sandbox.stub(worker.oictTransformation, "transform").callsFake(() => [testTransformedData[1]]);
        sandbox.stub(worker.potexTransformation, "transform").callsFake(() => [testTransformedData[2]]);

        sandbox.stub(worker.model, "save");
        sandbox.stub(worker, "sendMessageToExchange");
        queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + SortedWasteStations.name.toLowerCase();
        sandbox.stub(worker.model, "findOneById")
            .callsFake(() => testTransformedData[1]);
        sandbox.stub(worker.model, "findOne")
            .callsFake(() => testTransformedData[0]);
        sandbox.stub(worker, "mergeContainersIntoStations")
            .callsFake(() => [[testTransformedData[0]], [testTransformedData[1], testTransformedData[2]]]);
        sandbox.stub(worker.model, "updateOne");
        sandbox.stub(worker, "pairSensorWithContainer");
        sandbox.stub(worker.model, "aggregate");

        sandbox.stub(worker.sensorsContainersDatasource, "getAll").callsFake(() => testSensorContainersData);
        sandbox.stub(worker.sensorsMeasurementsDatasource, "getAll").callsFake(() => testSensorMeasurementData);
        sandbox.stub(worker.sensorsMeasurementsModel, "save");
        sandbox.stub(worker.sensorsMeasurementsModel, "aggregate").callsFake(() => []);
        sandbox.stub(worker.sensorsPicksDatasource, "getAll").callsFake(() => testSensorPicksData);
        sandbox.stub(worker.sensorsPicksModel, "save");
        sandbox.stub(worker.sensorsPicksModel, "aggregate").callsFake(() => []);

        sandbox.stub(worker.sensoneoMeasurementsTransformation, "transform").callsFake(() => testSensorMeasurementData);
        sandbox.stub(worker.sensoneoPicksTransformation, "transform").callsFake(() => testSensorPicksData);

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
        sandbox.assert.calledOnce(worker.potexDatasource.getAll);
        sandbox.assert.calledOnce(worker.iprTransformation.setContainers);
        sandbox.assert.calledOnce(worker.iprTransformation.transform);
        sandbox.assert.calledOnce(worker.oictTransformation.transform);
        sandbox.assert.calledOnce(worker.potexTransformation.transform);
        sandbox.assert.calledOnce(worker.model.save);
        testTransformedData.map((f) => {
            sandbox.assert.calledWith(worker.sendMessageToExchange,
                "workers." + queuePrefix + ".updateDistrict",
                JSON.stringify(f));
        });
        sandbox.assert.callOrder(
            worker.iprContainersDatasource.getAll,
            worker.iprTransformation.setContainers,
            worker.iprStationsDatasource.getAll,
            worker.iprTransformation.transform,
            worker.oictDatasource.getAll,
            worker.oictTransformation.transform,
            worker.potexDatasource.getAll,
            worker.potexTransformation.transform,
            worker.model.save,
            worker.sendMessageToExchange);
    });

    it("should calls the correct methods by updateDistrict method (different geo)", async () => {
        await worker.updateDistrict({content: Buffer.from(JSON.stringify(testTransformedData[0]))});
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
        await worker.updateDistrict({content: Buffer.from(JSON.stringify(testTransformedData[0]))});
        sandbox.assert.calledOnce(worker.model.findOneById);
        sandbox.assert.calledWith(worker.model.findOneById, testTransformedData[0].properties.id);

        sandbox.assert.notCalled(worker.cityDistrictsModel.findOne);
        sandbox.assert.notCalled(testTransformedData[1].save);
        sandbox.assert.notCalled(testTransformedData[1].remove);
    });

    it("should calls the correct methods by getSensorsAndPairThemWithContainers method", async () => {
        await worker.getSensorsAndPairThemWithContainers();

        sandbox.assert.calledOnce(worker.sensorsContainersDatasource.getAll);
        sandbox.assert.calledOnce(worker.pairSensorWithContainer);
    });

    it("should calls the correct methods by updateSensorsMeasurement method", async () => {
        await worker.updateSensorsMeasurement();

        sandbox.assert.calledOnce(worker.sensorsMeasurementsDatasource.getAll);
        sandbox.assert.calledOnce(worker.sensorsMeasurementsModel.save);
        testSensorMeasurementData.map((f) => {
            sandbox.assert.calledWith(worker.sendMessageToExchange,
                "workers." + queuePrefix + ".updateSensorsMeasurementInContainer",
                JSON.stringify(f));
        });
    });

    it("should calls the correct methods by updateSensorsMeasurementInContainer method", async () => {
        await worker.updateSensorsMeasurementInContainer({content: Buffer.from(
            JSON.stringify(testSensorMeasurementData[0]))});
        sandbox.assert.calledOnce(worker.model.findOne);
        sandbox.assert.calledOnce(worker.model.updateOne);
    });

    it("should calls the correct methods by updateSensorsPicks method", async () => {
        await worker.updateSensorsPicks();

        sandbox.assert.calledOnce(worker.sensorsPicksDatasource.getAll);
        sandbox.assert.calledOnce(worker.sensorsPicksModel.save);
        testSensorPicksData.map((f) => {
            sandbox.assert.calledWith(worker.sendMessageToExchange,
                "workers." + queuePrefix + ".updateSensorsPicksInContainer",
                JSON.stringify(f));
        });
    });

    it("should calls the correct methods by updateSensorsPicksInContainer method", async () => {
        await worker.updateSensorsPicksInContainer({content: Buffer.from(JSON.stringify(testSensorPicksData[0]))});
        sandbox.assert.calledOnce(worker.model.findOne);
        sandbox.assert.calledOnce(worker.model.updateOne);
    });

});
