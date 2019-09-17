"use strict";

import { CustomError } from "@golemio/errors";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { RedisConnector } from "../../../src/core/connectors";
import { HTTPProtocolStrategy, IHTTPSettings } from "../../../src/core/datasources";

const nock = require("nock");
chai.use(chaiAsPromised);

describe("HTTPProtocolStrategy", () => {

    let testSettings: IHTTPSettings;
    let strategy: HTTPProtocolStrategy;
    let scope;

    before(async () => {
        await RedisConnector.connect();
    });

    beforeEach(() => {
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
    });

    it("should has getData method", async () => {
        expect(strategy.getData).not.to.be.undefined;
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
