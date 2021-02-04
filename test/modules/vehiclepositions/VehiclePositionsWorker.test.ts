"use strict";

import "mocha";
import * as sinon from "sinon";
import { PostgresConnector, RedisConnector } from "../../../src/core/connectors";
import { VehiclePositionsWorker } from "../../../src/modules/vehiclepositions";

describe("VehiclePositionsWorker", () => {

    let worker;
    let sandbox;
    let sequelizeModelStub;
    let testData;

    beforeEach(() => {
        testData = {
            inserted: [{
                cis_short_name: "999",
                id: "999",
                start_cis_stop_id: "999",
                start_cis_stop_platform_code: "a",
                start_timestamp: null,
            }], updated: [],
        };

        sandbox = sinon.createSandbox({ useFakeTimers: true });
        sequelizeModelStub = Object.assign({
            hasMany: sandbox.stub(),
            hasOne: sandbox.stub(),
            removeAttribute: sandbox.stub(),
        });
        sandbox.stub(PostgresConnector, "getConnection")
            .callsFake(() => Object.assign({
                define: sandbox.stub().callsFake(() => sequelizeModelStub),
                query: sandbox.stub().callsFake(() => [true]),
                transaction: sandbox.stub().callsFake(() => Object.assign({ commit: sandbox.stub() })),
            }));
        sandbox.stub(RedisConnector, "getConnection");

        worker = new VehiclePositionsWorker();
        sandbox.stub(worker.transformation, "transform")
            .callsFake(() => Object.assign({ positions: [], stops: [], trips: [] }));
        sandbox.stub(worker.modelPositions, "save");
        sandbox.stub(worker.modelPositions, "getPositionsForUdpateDelay")
            .callsFake(() => [{ gtfs_trip_id: "0000", positions: [{ delay: null }]}]);
        sandbox.stub(worker, "computePositions")
            .callsFake(() => [{ delay: 10, id: "12321" }]);
        sandbox.stub(worker.modelPositions, "bulkUpdate");
        sandbox.stub(worker.modelStops, "saveBySqlFunction");
        sandbox.stub(worker.modelTrips, "saveBySqlFunction")
            .callsFake(() => testData);
        sandbox.stub(worker.modelTrips, "findAll")
            .callsFake((options) => Object.assign([]));
        sandbox.stub(worker.modelTrips, "findGTFSTripId")
            .callsFake(() => Object.assign(
                [
                    "2021-02-03T10:23:00Z_none_S45_1573",
                    "2021-02-03T10:23:00Z_none_S45_1573_gtfs_trip_id_1345_1573_201213",
                ],
            ));
        sandbox.stub(worker.modelTrips, "update");
        sandbox.stub(worker, "sendMessageToExchange");
        sandbox.stub(worker.delayComputationTripsModel, "getData")
            .callsFake(() => Object.assign({ shape_points: [] }));
        sandbox.stub(worker, "getEstimatedPoint")
            .callsFake(() => Object.assign({
                properties: { time_delay: 0, shape_dist_traveled: 0, next_stop_id: "00" } }));
        sandbox.stub(worker.gtfsRtModel, "save");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by saveDataToDB method", async () => {
        await worker.saveDataToDB({ content: Buffer.from(JSON.stringify({ m: { spoj: {} } })) });
        sandbox.assert.calledOnce(worker.transformation.transform);
        sandbox.assert.calledOnce(worker.modelTrips.saveBySqlFunction);
        sandbox.assert.calledWith(worker.modelTrips.saveBySqlFunction, []);
        sandbox.assert.calledOnce(worker.sendMessageToExchange);
        sandbox.assert.callOrder(
            worker.transformation.transform,
            worker.modelTrips.saveBySqlFunction,
            worker.sendMessageToExchange);
        sandbox.assert.callCount(PostgresConnector.getConnection, 5);
    });

    it("should calls the correct methods by saveStopsToDB method", async () => {
        await worker.saveStopsToDB({ content: Buffer.from(JSON.stringify({ m: { spoj: {} } })) });
        sandbox.assert.calledOnce(worker.transformation.transform);
        sandbox.assert.calledOnce(worker.modelStops.saveBySqlFunction);
        sandbox.assert.calledWith(worker.modelStops.saveBySqlFunction, []);
        sandbox.assert.callOrder(
            worker.transformation.transform,
            worker.modelStops.saveBySqlFunction);
        sandbox.assert.callCount(PostgresConnector.getConnection, 5);
    });

    it("should calls the correct methods by generateGtfsRt method", async () => {
        await worker.generateGtfsRt({ content: Buffer.from("0") });
        sandbox.assert.calledOnce(worker.modelTrips.findAll);
        sandbox.assert.callCount(worker.gtfsRtModel.save, 4);
    });

    it("should calls the correct methods by updateGTFSTripId method", async () => {
        await worker.updateGTFSTripId({ content: Buffer.from(JSON.stringify({
            data: [
              {
                cis_line_short_name: "S45",
                id: "2021-02-03T10:23:00Z_none_S45_1573",
                start_asw_stop_id: null,
                start_cis_stop_id: 5454396,
                start_timestamp: 1612347780000,
                // tslint:disable-next-line: object-literal-sort-keys
                agency_name_real: null,
                agency_name_scheduled: "ČESKÉ DRÁHY",
                cis_line_id: "none",
                cis_trip_number: 1573,
                origin_route_name: null,
                sequence_id: null,
                vehicle_registration_number: null,
                vehicle_type_id: 0,
                wheelchair_accessible: true,
              },
            ],
            positions: [
              {
                asw_last_stop_id: null,
                bearing: null,
                cis_last_stop_id: 5457066,
                cis_last_stop_sequence: 15,
                delay_stop_arrival: 0,
                delay_stop_departure: 0,
                is_canceled: false,
                lat: 50.238575,
                lng: 14.3130083,
                origin_time: "11:23:00",
                origin_timestamp: 1612347780000,
                speed: null,
                tracking: 1,
                trips_id: "2021-02-03T10:23:00Z_none_S45_1573",
              },
              {
                asw_last_stop_id: null,
                bearing: null,
                cis_last_stop_id: 5457066,
                cis_last_stop_sequence: 15,
                delay_stop_arrival: 0,
                delay_stop_departure: 0,
                is_canceled: false,
                lat: 50.238575,
                lng: 14.3130083,
                origin_time: "11:23:00",
                origin_timestamp: 1612347780000,
                speed: null,
                tracking: 1,
                trips_id: "2021-02-03T10:23:00Z_none_S45_1573_gtfs_trip_id_1345_1573_201213",
              },
            ],
          })) });
        sandbox.assert.calledOnce(worker.modelTrips.findGTFSTripId);
        sandbox.assert.calledOnce(worker.modelPositions.save);
        sandbox.assert.calledWith(worker.modelPositions.save, [
            {
              asw_last_stop_id: null,
              bearing: null,
              cis_last_stop_id: 5457066,
              cis_last_stop_sequence: 15,
              delay_stop_arrival: 0,
              delay_stop_departure: 0,
              is_canceled: false,
              lat: 50.238575,
              lng: 14.3130083,
              origin_time: "11:23:00",
              origin_timestamp: 1612347780000,
              speed: null,
              tracking: 1,
              trips_id: "2021-02-03T10:23:00Z_none_S45_1573",
            },
            {
              asw_last_stop_id: null,
              bearing: null,
              cis_last_stop_id: 5457066,
              cis_last_stop_sequence: 15,
              delay_stop_arrival: 0,
              delay_stop_departure: 0,
              is_canceled: false,
              lat: 50.238575,
              lng: 14.3130083,
              origin_time: "11:23:00",
              origin_timestamp: 1612347780000,
              speed: null,
              tracking: 1,
              trips_id: "2021-02-03T10:23:00Z_none_S45_1573_gtfs_trip_id_1345_1573_201213",
            },
          ]);
        sandbox.assert.calledOnce(worker.sendMessageToExchange);
    });

    it("should calls the correct methods by updateDelay method", async () => {
        await worker.updateDelay({ content: Buffer.from(JSON.stringify(new Array("0"))) });
        sandbox.assert.calledOnce(worker.modelPositions.getPositionsForUdpateDelay);
        sandbox.assert.calledOnce(worker.delayComputationTripsModel.getData);
        sandbox.assert.calledOnce(worker.computePositions);
    });

});
