import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon, { SinonSandbox, SinonStub } from "sinon";
import request from "supertest";
import http from "http";
import express from "@golemio/core/dist/shared/express";
import sentry from "@golemio/core/dist/shared/sentry";
import { HTTPErrorHandler, CustomError } from "@golemio/core/dist/shared/golemio-errors";
import { log } from "@golemio/core/dist/integration-engine/helpers";
import { config } from "@golemio/core/dist/integration-engine/config";
import {
    AMQPConnector,
    MongoConnector,
    PostgresConnector,
    RedisConnector,
} from "@golemio/core/dist/integration-engine/connectors";
import App from "../src/App";

chai.use(chaiAsPromised);

describe("App", () => {
    let expressApp: express.Application;
    let app: App;
    let sandbox: SinonSandbox;

    before(async () => {
        app = new App();
        await app.start();
        expressApp = app.express;
    });

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(process, "exit");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should start", async () => {
        expect(expressApp).not.to.be.undefined;
    });

    it("should have all config variables set", () => {
        expect(config).not.to.be.undefined;
        expect(config.MONGO_CONN).not.to.be.undefined;
    });

    it("should have health check on /", (done) => {
        request(expressApp)
            .get("/")
            .set("Accept", "application/json")
            .expect("Content-Type", /json/)
            .expect((res: Response) => {
                expect(res.body).to.deep.include({
                    app: "Golemio Data Platform Integration Engine",
                    health: true,
                    services: [
                        {
                            name: "PostgreSQL",
                            status: "UP",
                        },
                        {
                            name: "MongoDB",
                            status: "UP",
                        },
                        {
                            name: "RedisDB",
                            status: "UP",
                        },
                        {
                            name: "RabbitMQ",
                            status: "UP",
                        },
                    ],
                });
            })
            .expect(200, done);
    });

    it("should have health check on /health-check", (done) => {
        request(expressApp)
            .get("/health-check")
            .set("Accept", "application/json")
            .expect("Content-Type", /json/)
            .expect((res: Response) => {
                expect(res.body).to.deep.include({
                    app: "Golemio Data Platform Integration Engine",
                    health: true,
                    services: [
                        {
                            name: "PostgreSQL",
                            status: "UP",
                        },
                        {
                            name: "MongoDB",
                            status: "UP",
                        },
                        {
                            name: "RedisDB",
                            status: "UP",
                        },
                        {
                            name: "RabbitMQ",
                            status: "UP",
                        },
                    ],
                });
            })
            .expect(200, done);
    });

    it("should have all connection/channels connected", async () => {
        expect(AMQPConnector.getChannel).not.to.throw(CustomError);
        expect(MongoConnector.getConnection).not.to.throw(CustomError);
        expect(PostgresConnector.getConnection).not.to.throw(CustomError);
        expect(RedisConnector.getConnection).not.to.throw(CustomError);
    });

    describe("expressServer", () => {
        it("should create and start a server", async () => {
            sandbox.stub(app, "middleware" as any);
            sandbox.stub(app, "routes" as any);
            sandbox.stub(app, "errorHandlers" as any);
            sandbox.stub(app, "express" as any).value("test");
            sandbox.stub(log, "info");

            const httpEventStub = sandbox.stub();
            const httpListenStub = sandbox.stub();
            sandbox.stub(http, "createServer").returns({
                on: httpEventStub,
                listen: httpListenStub.callsFake((_port: number, cb: Function) => cb()),
            } as any);

            await app["expressServer"]();
            sandbox.assert.calledOnce(app["middleware"] as SinonStub);
            sandbox.assert.calledOnce(app["routes"] as SinonStub);
            sandbox.assert.calledOnce(app["errorHandlers"] as SinonStub);
            sandbox.assert.calledOnce(log.info as SinonStub);
            sandbox.assert.calledWithExactly(http.createServer as SinonStub, "test");
        });
    });

    describe("customHeaders", () => {
        it("should set headers", () => {
            const nextMock = sandbox.stub();
            const res = {
                setHeader: sandbox.stub(),
            };

            app["customHeaders"]("" as any, res as any, nextMock as any);
            sandbox.assert.called(res.setHeader);
            sandbox.assert.calledOnce(nextMock);
        });
    });

    describe("middleware", () => {
        it("should assign middleware to Express", () => {
            const expressMock = {
                use: sandbox.stub(),
            };
            sandbox.stub(app, "express" as any).value(expressMock);

            const sentryHandlers = {
                requestHandler: sandbox.stub(),
                tracingHandler: sandbox.stub(),
            };
            sandbox.stub(sentry, "Handlers").value(sentryHandlers);

            app["middleware"]();
            sandbox.assert.called(expressMock.use);
            sandbox.assert.calledOnce(sentryHandlers.requestHandler);
            sandbox.assert.calledOnce(sentryHandlers.tracingHandler);
        });
    });

    describe("routes", () => {
        it("should create a default router", () => {
            const routerMock = { get: sandbox.stub() };
            sandbox.stub(express, "Router").returns(routerMock as any);

            const expressMock = { use: sandbox.stub() };
            sandbox.stub(app, "express" as any).value(expressMock);

            app["routes"]();
            sandbox.assert.calledOnce(express.Router as SinonStub);
            sandbox.assert.calledWithExactly(routerMock.get, sinon.match.typeOf("array"), sinon.match.typeOf("function"));
            sandbox.assert.calledWithExactly(expressMock.use, sinon.match.typeOf("string"), routerMock);
        });
    });

    describe("errorHandlers", () => {
        it("should assign error middleware to Express", () => {
            const expressMock = { use: sandbox.stub() };
            sandbox.stub(app, "express" as any).value(expressMock);

            const sentryHandlers = {
                errorHandler: sandbox.stub(),
            };
            sandbox.stub(sentry, "Handlers").value(sentryHandlers);

            app["errorHandlers"]();
            sandbox.assert.calledThrice(expressMock.use);
            sandbox.assert.calledOnce(sentryHandlers.errorHandler);
        });

        it("generic error handler should log stuff and set header", () => {
            const resStatusMock = sandbox.stub();
            const resMock = {
                setHeader: sandbox.stub(),
                status: sandbox.stub().returns({ send: resStatusMock }),
            };

            const expressMock = {
                use: sandbox
                    .stub()
                    .callsFake(
                        (cb: Function | undefined) =>
                            typeof cb === "function" && cb.length === 4 && cb("test", "", resMock, Function)
                    ),
            };
            sandbox.stub(app, "express" as any).value(expressMock);

            const sentryHandlers = {
                errorHandler: sandbox.stub(),
            };
            sandbox.stub(sentry, "Handlers").value(sentryHandlers);
            sandbox.stub(log, "silly");
            sandbox.stub(HTTPErrorHandler, "handle").returns({ error_status: 400 } as any);

            app["errorHandlers"]();
            sandbox.assert.calledWithExactly(HTTPErrorHandler.handle as SinonStub, "test", log);
            sandbox.assert.calledWithExactly(log.silly as SinonStub, sinon.match.typeOf("string"));
            sandbox.assert.calledWithExactly(resMock.setHeader, sinon.match.typeOf("string"), sinon.match.typeOf("string"));
            sandbox.assert.calledWithExactly(resMock.status, 400);
            sandbox.assert.calledWithExactly(resStatusMock, { error_status: 400 });
        });
    });

    describe("cancelConsumers", () => {
        it("should call cancelConsumers on every queueProcessor", async () => {
            const cancelConsumersStub = sinon.stub();
            sandbox.stub(app, "queueProcessors" as any).value(new Set().add({ cancelConsumers: cancelConsumersStub }));

            await app["cancelConsumers"]();
            sandbox.assert.calledOnce(cancelConsumersStub);
        });
    });
});
