"use strict";

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

        testDataAppLaunch = [  ];
        testDataEvents = [  ];
        testDataRoute = [  ];
        testDataWebEvents = [  ];

        worker = new FirebasePidlitackaWorker();

        sandbox.stub(worker.appLaunchDatasource, "getAll")
            .callsFake(() => testDataAppLaunch);
        sandbox.stub(worker.eventsDatasource, "getAll")
            .callsFake(() => testDataEvents);
        sandbox.stub(worker.routeDatasource, "getAll")
            .callsFake(() => testDataRoute);
        sandbox.stub(worker.webEventsDatasource, "getAll")
            .callsFake(() => testDataWebEvents);

        sandbox.stub(worker.appLaunchProtocolStrategy, "deleteData");
        sandbox.stub(worker.eventsProtocolStrategy, "deleteData");
        sandbox.stub(worker.routeProtocolStrategy, "deleteData");
        sandbox.stub(worker.webEventsProtocolStrategy, "deleteData");

        sandbox.stub(worker.appLaunchModel, "saveBySqlFunction");
        sandbox.stub(worker.eventsModel, "saveBySqlFunction");
        sandbox.stub(worker.routeModel, "saveBySqlFunction");
        sandbox.stub(worker.webEventsModel, "saveBySqlFunction");

        sandbox.stub(worker, "sendMessageToExchange");
        queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + FirebasePidlitacka.name.toLowerCase();
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by moveAll method", async () => {
        await worker.moveAll();
        sandbox.assert.callCount(worker.sendMessageToExchange, 4);
        [ "moveAppLaunch", "moveEvents", "moveRoute", "moveWebEvents" ].map((f) => {
            sandbox.assert.calledWith(worker.sendMessageToExchange,
                "workers." + queuePrefix + "." + f,
                "Just do it!");
        });
    });

    it("should calls the correct methods by moveAppLaunch method", async () => {
        await worker.moveAppLaunch();
        sandbox.assert.calledOnce(worker.appLaunchDatasource.getAll);
        sandbox.assert.calledOnce(worker.appLaunchModel.saveBySqlFunction);
        sandbox.assert.calledOnce(worker.appLaunchProtocolStrategy.deleteData);
        sandbox.assert.callOrder(
            worker.appLaunchDatasource.getAll,
            worker.appLaunchModel.saveBySqlFunction,
            worker.appLaunchProtocolStrategy.deleteData);
    });

    it("should calls the correct methods by moveEvents method", async () => {
        await worker.moveEvents();
        sandbox.assert.calledOnce(worker.eventsDatasource.getAll);
        sandbox.assert.calledOnce(worker.eventsModel.saveBySqlFunction);
        sandbox.assert.calledOnce(worker.eventsProtocolStrategy.deleteData);
        sandbox.assert.callOrder(
            worker.eventsDatasource.getAll,
            worker.eventsModel.saveBySqlFunction,
            worker.eventsProtocolStrategy.deleteData);
    });

    it("should calls the correct methods by moveRoute method", async () => {
        await worker.moveRoute();
        sandbox.assert.calledOnce(worker.routeDatasource.getAll);
        sandbox.assert.calledOnce(worker.routeModel.saveBySqlFunction);
        sandbox.assert.calledOnce(worker.routeProtocolStrategy.deleteData);
        sandbox.assert.callOrder(
            worker.routeDatasource.getAll,
            worker.routeModel.saveBySqlFunction,
            worker.routeProtocolStrategy.deleteData);
    });

    it("should calls the correct methods by moveWebEvents method", async () => {
        await worker.moveWebEvents();
        sandbox.assert.calledOnce(worker.webEventsDatasource.getAll);
        sandbox.assert.calledOnce(worker.webEventsModel.saveBySqlFunction);
        sandbox.assert.calledOnce(worker.webEventsProtocolStrategy.deleteData);
        sandbox.assert.callOrder(
            worker.webEventsDatasource.getAll,
            worker.webEventsModel.saveBySqlFunction,
            worker.webEventsProtocolStrategy.deleteData);
    });

});
