"use strict";

import { CustomError } from "@golemio/errors";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import * as sinon from "sinon";

import { RedisConnector } from "../../../src/core/connectors";
import { HTTPProtocolStrategy, IHTTPSettings } from "../../../src/core/datasources";

import * as RawDaraStore from "../../../src/core/helpers/RawDaraStore";

import * as nock from "nock";
chai.use(chaiAsPromised);

describe("HTTPProtocolStrategy", () => {

    let testSettings: IHTTPSettings;
    let sandbox: any;
    let strategy: HTTPProtocolStrategy;
    let scope: any;

    before(async () => {
        await RedisConnector.connect();
    });

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        testSettings = {
            headers : {},
            method: "GET",
            url: "https://httpbin.org/get",
        };
        strategy = new HTTPProtocolStrategy(testSettings);
        scope = nock("https://httpbin.org")
            .get("/get")
            .reply(200, {
                get: "ok",
            });
        scope = nock("https://httpbin.org")
            .get("/ip")
            .reply(200, {
                ip: "ok",
            });
        scope = nock("https://example.com")
            .get("/testzip.zip")
            .replyWithFile(200, __dirname + "/../../data/testzip.zip", {
                "Content-Type": "application/zip",
            });
        scope = nock("https://notfound.com")
            .get("/")
            .reply(404);

        sandbox.spy(strategy, "getRawData");
        sandbox.spy(RawDaraStore, "save");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should has getData method", async () => {
        expect(strategy.getData).not.to.be.undefined;
    });

    it("should has getRawData method", async () => {
        expect(strategy.getRawData).not.to.be.undefined;
    });

    it("should has getLastModified method", async () => {
        expect(strategy.getLastModified).not.to.be.undefined;
    });

    it("should has setConnectionSettings method", async () => {
        expect(strategy.setConnectionSettings).not.to.be.undefined;
    });

    it("should properly get data", async () => {
        const res = await strategy.getData();
        expect(res).to.be.equal('{"get":"ok"}');
        sandbox.assert.calledOnce(strategy.getRawData);
        sandbox.assert.calledOnce(RawDaraStore.save);
    });

    it("should throw error if getting data failed", async () => {
        testSettings.url = "https://notfound.com";
        strategy.setConnectionSettings(testSettings);
        await expect(strategy.getData()).to.be.rejectedWith(CustomError);
    });

    it("should properly get data in zip format", async () => {
        testSettings.url = "https://example.com/testzip.zip";
        testSettings.isCompressed = true;
        testSettings.encoding = null;
        const res = await strategy.getData();
        expect(res.length).to.be.equal(2);
    });

    it("should properly get only whitelisted data in zip format", async () => {
        testSettings.url = "https://example.com/testzip.zip";
        testSettings.isCompressed = true;
        testSettings.encoding = null;
        testSettings.whitelistedFiles = [ "test1.txt" ];
        const res = await strategy.getData();
        expect(res.length).to.be.equal(1);
        expect(res[0].filepath).to.be.equal("testzip/test1.txt");
    });

    it("should properly get last modified", async () => {
        scope = nock("https://httpbin.org")
            .intercept("/get", "HEAD")
            .reply(200, undefined, { "last-modified": "Tue, 12 Mar 2019 17:32:09 GMT"});
        const res = await strategy.getLastModified();
        expect(res).to.be.equal("2019-03-12T17:32:09.000Z");
    });

    it("should return null if last modified is not provided", async () => {
        testSettings.url = "https://notfound.com";
        strategy.setConnectionSettings(testSettings);
        const res = await strategy.getLastModified();
        expect(res).to.be.null;
    });

    it("should set settings options", async () => {
        testSettings.url = "https://httpbin.org/ip";
        strategy.setConnectionSettings(testSettings);
        const res = await strategy.getData();
        expect(res).to.be.equal('{"ip":"ok"}');
    });

});
