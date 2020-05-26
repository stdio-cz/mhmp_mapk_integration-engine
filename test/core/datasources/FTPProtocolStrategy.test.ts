"use strict";

import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import * as sinon from "sinon";
import { RedisConnector } from "../../../src/core/connectors";
import { FTPProtocolStrategy, IFTPSettings } from "../../../src/core/datasources";

import * as RawDaraStore from "../../../src/core/helpers/RawDaraStore";

import * as ftp from "basic-ftp";
import * as fs from "fs";
chai.use(chaiAsPromised);

describe("FTPProtocolStrategy", () => {

    let testSettings: IFTPSettings;
    let strategy: any;
    let sandbox: any;
    let downloadStub;
    let lastmodStub;
    let now;

    before(async () => {
        await RedisConnector.connect();
    });

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        now = new Date();
        sandbox.stub(fs, "createWriteStream");
        downloadStub = sandbox.stub();
        lastmodStub = sandbox.stub().callsFake(() => now);
        sandbox.stub(ftp, "Client").callsFake(() => Object.assign({
            access: sandbox.stub(),
            cd: sandbox.stub(),
            download: downloadStub,
            ftp: {
                log: sandbox.stub(),
                silly: sandbox.stub(),
            },
            lastMod: lastmodStub,
        }));

        testSettings = {
            filename: "ropidgtfsstops-datasource.json",
            path: "/",
            tmpDir: __dirname + "/../../data/",
            url: {
                host: "",
                password: "",
                secure: null,
                user: "",
            },
        };
        strategy = new FTPProtocolStrategy(testSettings);

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
        expect(res).to.be.a("string");
        sandbox.assert.calledOnce(strategy.getRawData);
        sandbox.assert.calledOnce(RawDaraStore.save);
    });

    it("should throw error if getting data failed", async () => {
        downloadStub.throws(new Error("test"));
        await expect(strategy.getData()).to.be.rejectedWith(Error);
    });

    it("should properly get data in zip format", async () => {
        testSettings.filename = "testzip.zip";
        testSettings.isCompressed = true;
        strategy.setConnectionSettings(testSettings);
        const res = await strategy.getData();
        expect(res.length).to.be.equal(2);
    });

    it("should properly get only whitelisted data in zip format", async () => {
        testSettings.filename = "testzip.zip";
        testSettings.isCompressed = true;
        testSettings.whitelistedFiles = [ "test1.txt" ];
        strategy.setConnectionSettings(testSettings);
        const res = await strategy.getData();
        expect(res.length).to.be.equal(1);
        expect(res[0].filepath).to.be.equal("testzip/test1.txt");
    });

    it("should properly get data in folder", async () => {
        testSettings.filename = "medicalinstitutions";
        testSettings.hasSubFiles = true;
        strategy.setConnectionSettings(testSettings);
        const res = await strategy.getData();
        expect(res.length).to.be.equal(4);
    });

    it("should properly get only whitelisted data in folder", async () => {
        testSettings.filename = "medicalinstitutions";
        testSettings.hasSubFiles = true;
        testSettings.whitelistedFiles = [ "lekarny_seznam.csv" ];
        strategy.setConnectionSettings(testSettings);
        const res = await strategy.getData();
        expect(res.length).to.be.equal(1);
        expect(res[0].filepath).to.be.equal("medicalinstitutions/lekarny_seznam.csv");
    });

    it("should properly get last modified", async () => {
        const res = await strategy.getLastModified();
        expect(res).to.be.equal(now.toISOString());
    });

    it("should return null if last modified is not provided", async () => {
        lastmodStub.callsFake(() => null);
        const res = await strategy.getLastModified();
        expect(res).to.be.null;
    });

    it("should set settings options", async () => {
        expect(strategy.connectionSettings.hasSubFiles).to.be.undefined;
        testSettings.hasSubFiles = true;
        strategy.setConnectionSettings(testSettings);
        expect(strategy.connectionSettings.hasSubFiles).to.be.true;
    });

});
