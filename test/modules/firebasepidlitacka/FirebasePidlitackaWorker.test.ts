"use strict";
import { Readable } from "stream";

import { FirebasePidlitacka } from "@golemio/schema-definitions";
import "mocha";
import * as sinon from "sinon";
import { config } from "../../../src/core/config";
import { PostgresConnector } from "../../../src/core/connectors";
import { FirebasePidlitackaWorker } from "../../../src/modules/firebasepidlitacka";

describe("FirebasePidlitackaWorker", () => {

    let worker;
    let sandbox;
    let sequelizeModelStub;
    let queuePrefix;
    let testDataAppLaunch;
    let testDataEvents;
    let testDataRoute;
    let testDataWebEvents;

    const getAll = async (data) => {
        const stream =  new Readable({
            objectMode: true,
        });
        stream.push(data);
        stream.push(null);
        return stream;
    };

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sequelizeModelStub = Object.assign({
            hasMany: sandbox.stub(),
            removeAttribute: sandbox.stub(),
        });
        sandbox.stub(PostgresConnector, "getConnection")
            .callsFake(() => Object.assign({
                define: sandbox.stub().callsFake(() => sequelizeModelStub),
                query: sandbox.stub().callsFake(() => [true]),
                transaction: sandbox.stub().callsFake(() => Object.assign({commit: sandbox.stub()})),
            }));

        testDataAppLaunch = [
            {
              anonym: 1246,
              anonym_users: 380,
              event_count: 36855,
              event_date: "2020-04-19",
              hasnfc: 12825,
              hasnfc_users: 3527,
              isanonym: 5570,
              isanonym_users: 1310,
              mail_users: 1914,
              mails: 7520,
              noti_users: 5496,
              notis: 21482,
              users: 9388,
            },
          ];
        testDataEvents = [
            {
              event_count: 10129,
              event_date: "2020-04-19",
              event_name: "notification_dismiss",
              users: 1873,
            },
            {
              event_count: 36855,
              event_date: "2020-04-19",
              event_name: "appLaunch",
              users: 9388,
            },
            {
              event_count: 15537,
              event_date: "2020-04-19",
              event_name: "connectionSearch",
              users: 5211,
            },
          ];
        testDataRoute = [
            {
              count_case: 1,
              reference_date: "2020-04-19",
              s_from: "Písková",
              s_to: "",
            },
            {
              count_case: 1,
              reference_date: "2020-04-19",
              s_from: "Můstek",
              s_to: "",
            },
            {
              count_case: 1,
              reference_date: "2020-04-19",
              s_from: "Vodičkova",
              s_to: "",
            },
          ];
        testDataWebEvents = [
            {
              id: "34948266c7ed1ab0c1e32baa47ef53a6dd05d6ff",
              id_profile: "180272358",
              reference_date: "2020-04-20",
              sessions: 715,
              users: 487,
            },
            {
              id: "bb0919745db9f0bb2daeaf797192950e1df53abd",
              id_profile: "180272358",
              reference_date: "2020-04-19",
              sessions: 3060,
              users: 1820,
            },
          ];

        worker = new FirebasePidlitackaWorker();

        sandbox.stub(worker.appLaunchDatasource, "getAll")
            .callsFake(async () => getAll(testDataAppLaunch));
        sandbox.stub(worker.eventsDatasource, "getAll")
            .callsFake(() => getAll(testDataEvents));
        sandbox.stub(worker.routeDatasource, "getAll")
            .callsFake(() => getAll(testDataRoute));
        sandbox.stub(worker.webEventsDatasource, "getAll")
            .callsFake(() => getAll(testDataWebEvents));

        sandbox.stub(worker.appLaunchProtocolStrategy, "deleteData");
        sandbox.stub(worker.eventsProtocolStrategy, "deleteData");
        sandbox.stub(worker.routeProtocolStrategy, "deleteData");
        sandbox.stub(worker.webEventsProtocolStrategy, "deleteData");

        sandbox.stub(worker.appLaunchModel, "saveBySqlFunction").callsFake(async (): Promise<void> => {
            return;
        });
        sandbox.stub(worker.eventsModel, "saveBySqlFunction");
        sandbox.stub(worker.routeModel, "saveBySqlFunction");
        sandbox.stub(worker.webEventsModel, "saveBySqlFunction");

        sandbox.spy(worker, "moveData");

        sandbox.stub(worker, "sendMessageToExchange");
        queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + FirebasePidlitacka.name.toLowerCase();
    });

    afterEach(() => {
        sandbox.restore();
    });

    // it("should calls the correct methods by moveAll method", async () => {
    //     await worker.moveAll();
    //     sandbox.assert.callCount(worker.sendMessageToExchange, 4);
    //     [ "moveAppLaunch", "moveEvents", "moveRoute", "moveWebEvents" ].map((f) => {
    //         sandbox.assert.calledWith(worker.sendMessageToExchange,
    //             "workers." + queuePrefix + "." + f,
    //             "Just do it!");
    //     });
    // });

    it("should calls the correct methods by moveAppLaunch method", async () => {
        await worker.moveAppLaunch();

        sandbox.assert.calledOnce(worker.appLaunchDatasource.getAll);

        worker.dataStream.on("end", () => {

            sandbox.assert.calledOnce(worker.moveData);
            sandbox.assert.calledOnce(worker.appLaunchModel.saveBySqlFunction);
            sandbox.assert.calledWith(worker.appLaunchModel.saveBySqlFunction, testDataAppLaunch);
            sandbox.assert.calledOnce(worker.appLaunchProtocolStrategy.deleteData);
            sandbox.assert.callOrder(
                worker.appLaunchDatasource.getAll,
                worker.appLaunchModel.saveBySqlFunction,
                worker.appLaunchProtocolStrategy.deleteData);
        });
    });

    it("should calls the correct methods by moveEvents method", async () => {
        await worker.moveEvents();

        sandbox.assert.calledOnce(worker.eventsDatasource.getAll);

        worker.dataStream.on("end", () => {

            sandbox.assert.calledOnce(worker.moveData);
            sandbox.assert.calledOnce(worker.eventsModel.saveBySqlFunction);
            sandbox.assert.calledWith(worker.eventsModel.saveBySqlFunction, testDataEvents);
            sandbox.assert.calledOnce(worker.eventsProtocolStrategy.deleteData);
            sandbox.assert.callOrder(
                worker.eventsDatasource.getAll,
                worker.eventsModel.saveBySqlFunction,
                worker.eventsProtocolStrategy.deleteData);
        });
    });

    it("should calls the correct methods by moveRoute method", async () => {

        await worker.moveRoute();

        sandbox.assert.calledOnce(worker.routeDatasource.getAll);

        worker.dataStream.on("end", () => {

            sandbox.assert.calledOnce(worker.moveData);
            sandbox.assert.calledOnce(worker.routeModel.saveBySqlFunction);
            sandbox.assert.calledWith(worker.routeModel.saveBySqlFunction, testDataRoute);
            sandbox.assert.calledOnce(worker.routeProtocolStrategy.deleteData);
            sandbox.assert.callOrder(
                worker.routeDatasource.getAll,
                worker.routeModel.saveBySqlFunction,
                worker.routeProtocolStrategy.deleteData);
        });
    });

    it("should calls the correct methods by moveWebEvents method", async () => {

        await worker.moveWebEvents();

        sandbox.assert.calledOnce(worker.webEventsDatasource.getAll);

        worker.dataStream.on("end", () => {

            sandbox.assert.calledOnce(worker.moveData);
            sandbox.assert.calledOnce(worker.webEventsModel.saveBySqlFunction);
            sandbox.assert.calledWith(worker.webEventsModel.saveBySqlFunction, testDataWebEvents);
            sandbox.assert.calledOnce(worker.webEventsProtocolStrategy.deleteData);
            sandbox.assert.callOrder(
                worker.webEventsDatasource.getAll,
                worker.webEventsModel.saveBySqlFunction,
                worker.webEventsProtocolStrategy.deleteData);
        });
    });

});
