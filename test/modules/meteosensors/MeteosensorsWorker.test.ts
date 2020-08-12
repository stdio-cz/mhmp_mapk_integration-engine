"use strict";

import { Meteosensors } from "@golemio/schema-definitions";
import "mocha";
import * as sinon from "sinon";
import { config } from "../../../src/core/config";
import { DataSourceStream } from "../../../src/core/datasources/DataSourceStream";
import { MeteosensorsWorker} from "../../../src/modules/meteosensors";
import { waitTillStreamEnds } from "../../helpers";

describe("MeteosensorsWorker", () => {

    let worker;
    let sandbox;
    let queuePrefix;
    let testData;
    let testTransformedData;
    let testTransformedHistoryData;
    let data0;
    let data1;
    let dataStream;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        testData = [
            {
              airTemperature: 12.7,
              alarm: 0,
              devPoint: 5.29,
              district: null,
              freezTemperature: 0,
              gid: null,
              humidity: 60.79,
              id: 531801,
              lastUpdated: new Date().getTime(),
              lat: 50.03993,
              lng: 14.405042,
              mark: null,
              name: "1-Barrandov",
              prec: 0,
              prectype: 0,
              prefix: null,
              roadTemperature: 23,
              roadWet: null,
              sgid: 1,
              spray: null,
              sprayProgram: 0,
              street: null,
              tankLevel: 61.23,
              technology: "Boschung",
              tmsAlarm: 0,
              windDirection: 185,
              windSpeed: 1.49,
            },
            {
              airTemperature: 11.4,
              alarm: 0,
              devPoint: 4.05,
              district: null,
              freezTemperature: 0,
              gid: null,
              humidity: 60.69,
              id: 531802,
              lastUpdated: new Date().getTime(),
              lat: 50.085625,
              lng: 14.436838,
              mark: null,
              name: "2-Bulhar",
              prec: 0,
              prectype: 0,
              prefix: null,
              roadTemperature: 27.05,
              roadWet: null,
              sgid: 1,
              spray: null,
              sprayProgram: 0,
              street: null,
              tankLevel: 54.59,
              technology: "Boschung",
              tmsAlarm: 0,
              windDirection: 40,
              windSpeed: 1.78,
            },
        ];
        testTransformedData = [
            {
              geometry: {
                coordinates: [
                  14.405042,
                  50.03993,
                ],
                type: "Point",
              },
              properties: {
                air_temperature: 13.01,
                humidity: 57,
                id: 531801,
                last_updated: 1589448004000,
                name: "Barrandov",
                road_temperature: 23.32,
                updated_at: 1589448024805,
                wind_direction: null,
                wind_speed: 1.17,
              },
              type: "Feature",
            },
            {
              geometry: {
                coordinates: [
                  14.436838,
                  50.085625,
                ],
                type: "Point",
              },
              properties: {
                air_temperature: 10.94,
                humidity: 61,
                id: 531802,
                last_updated: 1589448009000,
                name: "Bulhar",
                road_temperature: 25.37,
                updated_at: 1589448024805,
                wind_direction: 95,
                wind_speed: 1.05,
              },
              type: "Feature",
            },
        ];
        testTransformedHistoryData = [1, 2];
        data0 = {properties: {id: 0}, geometry: {coordinates: [0, 0]}};
        data1 = {properties: {id: 1}, geometry: {coordinates: [1, 1]}, save: sandbox.stub().resolves(true)};

        worker = new MeteosensorsWorker();

        const getOutputStream = async (data, stream) => {
            stream.push(data);
            stream.push(null);
            return stream;
          };

        dataStream =  new DataSourceStream({
        objectMode: true,
        read: () => {
            return;
        },
        });

        sandbox.stub(worker.dataSource, "getOutputStream")
            .callsFake(() => getOutputStream(testData, dataStream));
        sandbox.stub(worker.transformation, "transform")
            .callsFake(() => testTransformedData);
        sandbox.stub(worker.transformation, "transformHistory")
            .callsFake(() => testTransformedHistoryData);
        sandbox.stub(worker.model, "save");
        sandbox.stub(worker.historyModel, "save");
        sandbox.stub(worker, "sendMessageToExchange");
        queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + Meteosensors.name.toLowerCase();
        sandbox.stub(worker.model, "findOneById")
            .callsFake(() => data1);

        sandbox.stub(worker.cityDistrictsModel, "findOne");
        sandbox.spy(worker.dataSource, "getAll");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by refreshDataInDB method", async () => {
        await worker.refreshDataInDB();
        await waitTillStreamEnds(worker.dataStream);

        sandbox.assert.calledOnce(worker.dataSource.getAll);
        sandbox.assert.calledOnce(worker.transformation.transform);
        sandbox.assert.calledWith(worker.transformation.transform, testData);
        sandbox.assert.calledOnce(worker.model.save);
        sandbox.assert.calledWith(worker.model.save, testTransformedData);
        sandbox.assert.calledThrice(worker.sendMessageToExchange);
        sandbox.assert.calledWith(worker.sendMessageToExchange,
            "workers." + queuePrefix + ".saveDataToHistory",
            JSON.stringify(testTransformedData));
        testTransformedData.map((f) => {
            sandbox.assert.calledWith(worker.sendMessageToExchange,
                "workers." + queuePrefix + ".updateDistrict",
                JSON.stringify(f));
        });
        sandbox.assert.callOrder(
            worker.dataSource.getAll,
            worker.transformation.transform,
            worker.model.save,
            worker.sendMessageToExchange);
    });

    it("should calls the correct methods by saveDataToHistory method", async () => {
        await worker.saveDataToHistory({content: Buffer.from(JSON.stringify(testTransformedData))});
        sandbox.assert.calledOnce(worker.transformation.transformHistory);
        sandbox.assert.calledWith(worker.transformation.transformHistory, testTransformedData);
        sandbox.assert.calledOnce(worker.historyModel.save);
        sandbox.assert.calledWith(worker.historyModel.save, testTransformedHistoryData);
        sandbox.assert.callOrder(
            worker.transformation.transformHistory,
            worker.historyModel.save,
        );
    });

    it("should calls the correct methods by updateDistrict method (different geo)", async () => {
        await worker.updateDistrict({content: Buffer.from(JSON.stringify(data0))});
        sandbox.assert.calledOnce(worker.model.findOneById);
        sandbox.assert.calledWith(worker.model.findOneById, data0.properties.id);

        sandbox.assert.calledOnce(worker.cityDistrictsModel.findOne);
        sandbox.assert.calledOnce(data1.save);
    });

    it("should calls the correct methods by updateDistrict method (same geo)", async () => {
        data1 = {
            geometry: {coordinates: [0, 0]},
            properties: {
                address: "a",
                district: "praha-0",
                id: 1},
            save: sandbox.stub().resolves(true),
        };
        await worker.updateDistrict({content: Buffer.from(JSON.stringify(data0))});
        sandbox.assert.calledOnce(worker.model.findOneById);
        sandbox.assert.calledWith(worker.model.findOneById, data0.properties.id);

        sandbox.assert.notCalled(worker.cityDistrictsModel.findOne);
        sandbox.assert.notCalled(data1.save);
    });

});
