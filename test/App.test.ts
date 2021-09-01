import { CustomError } from "@golemio/core/dist/shared/golemio-errors";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import express from "@golemio/core/dist/shared/express";
import sinon from "sinon";
import request from "supertest";
import App from "../src/App";
import { config } from "@golemio/core/dist/integration-engine/config";
import {
    AMQPConnector,
    MongoConnector,
    PostgresConnector,
    RedisConnector,
} from "@golemio/core/dist/integration-engine/connectors";

chai.use(chaiAsPromised);

describe("App", () => {
    let expressApp: express.Application;
    let app: App;
    let sandbox: any;
    let exitStub: any;

    before(async () => {
        app = new App();
        await app.start();
        expressApp = app.express;
    });

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        exitStub = sandbox.stub(process, "exit");
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
});
