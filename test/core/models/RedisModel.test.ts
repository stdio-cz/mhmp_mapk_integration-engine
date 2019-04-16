/// <reference path="../../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import { RedisConnector } from "../../../src/core/connectors";
import { Validator } from "../../../src/core/helpers";
import { IRedisSettings, RedisModel } from "../../../src/core/models";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

describe("RedisModel", () => {

    let settings: IRedisSettings;
    let model;
    let connection;

    before(async () => {
        connection = await RedisConnector.connect();
    });

    beforeEach(() => {
        settings = {
            decodeDataAfterGet: JSON.parse,
            encodeDataBeforeSave: JSON.stringify,
            isKeyConstructedFromData: true,
            prefix: "test",
            tmpPrefix: "tmp_test",
        };
        model = new RedisModel("Test" + "Model",
            settings,
            null);
    });

    it("should has save method", () => {
        expect(model.save).not.to.be.undefined;
    });

    it("should has getData method", () => {
        expect(model.getData).not.to.be.undefined;
    });

    it("should has truncate method", () => {
        expect(model.truncate).not.to.be.undefined;
    });

    it("should save and get the basic record without prefix", async () => {
        settings = {
            isKeyConstructedFromData: false,
            prefix: null,
        };
        model = new RedisModel("Test" + "Model",
            settings,
            null);
        await model.save("testkey", "testdata");
        expect(await connection.keys("*")).to.be.an("array").that.include("(default)");
        expect(await connection.hget("(default)", "testkey")).to.equal(await model.getData("testkey"));
    });

    it("should saves the basic record with prefix", async () => {
        settings = {
            isKeyConstructedFromData: false,
            prefix: "test",
        };
        model = new RedisModel("Test" + "Model",
            settings,
            null);
        await model.save("testkey", "testdata");
        expect(await connection.keys("*")).to.be.an("array").that.include("test");
        expect(await connection.hget("test", "testkey")).to.equal(await model.getData("testkey"));
    });

    it("should saves the record with key constructed from data (without data encode/decode)", async () => {
        settings = {
            isKeyConstructedFromData: true,
            prefix: "test",
        };
        model = new RedisModel("Test" + "Model",
            settings,
            null);
        const testdata = {
            key: {
                subkey: "testkey2",
                value: "testdata2",
            },
        };
        await model.save("key.subkey", testdata);
        expect(await connection.hget("test", "testkey2")).to.equal("[object Object]");
        expect(await connection.hget("test", "testkey2")).to.equal(await model.getData("testkey2"));
    });

    it("should saves the record with key constructed from data (with data encode/decode)", async () => {
        settings = {
            decodeDataAfterGet: JSON.parse,
            encodeDataBeforeSave: JSON.stringify,
            isKeyConstructedFromData: true,
            prefix: "test",
        };
        model = new RedisModel("Test" + "Model",
            settings,
            null);
        const testdata = {
            key: {
                subkey: "testkey2",
                value: "testdata2",
            },
        };
        await model.save("key.subkey", testdata);
        expect(JSON.parse(await connection.hget("test", "testkey2"))).to.deep.equal(testdata);
        expect(JSON.parse(await connection.hget("test", "testkey2"))).to.deep.equal(await model.getData("testkey2"));
    });

    it("should saves the array of records with key constructed from data (with data encode/decode)", async () => {
        settings = {
            decodeDataAfterGet: JSON.parse,
            encodeDataBeforeSave: JSON.stringify,
            isKeyConstructedFromData: true,
            prefix: "test",
        };
        model = new RedisModel("Test" + "Model",
            settings,
            null);
        const testdata = [
            {
                key: {
                    subkey: "testkey2",
                    value: "testdata2",
                },
            },
            {
                key: {
                    subkey: "testkey3",
                    value: "testdata3",
                },
            },
        ];
        await model.save("key.subkey", testdata);
        expect(JSON.parse(await connection.hget("test", "testkey2"))).to.deep.equal(testdata[0]);
        expect(JSON.parse(await connection.hget("test", "testkey3"))).to.deep.equal(testdata[1]);
        expect(JSON.parse(await connection.hget("test", "testkey2"))).to.deep.equal(await model.getData("testkey2"));
        expect(JSON.parse(await connection.hget("test", "testkey3"))).to.deep.equal(await model.getData("testkey3"));
    });

    it("should throw error if data is not object but key os constructed from data", async () => {
        settings = {
            isKeyConstructedFromData: true,
            prefix: "test",
        };
        model = new RedisModel("Test" + "Model",
            settings,
            null);
        const testdata = "testdata2";
        expect(model.save("key.subkey", testdata)).to.be.rejected;
    });

    it("should saves the array of records with key constructed from data (with data encode/decode)", async () => {
        settings = {
            decodeDataAfterGet: JSON.parse,
            encodeDataBeforeSave: JSON.stringify,
            isKeyConstructedFromData: true,
            prefix: "test",
        };
        model = new RedisModel("Test" + "Model",
            settings,
            null);
        const testdata = [
            {
                key: {
                    subkey: "testkey2",
                    value: "testdata2",
                },
            },
            "testdata3",
        ];
        expect(model.save("key.subkey", testdata)).to.be.rejected;
    });

    it("should throw error if data is not valid", async () => {
        settings = {
            decodeDataAfterGet: JSON.parse,
            encodeDataBeforeSave: JSON.stringify,
            isKeyConstructedFromData: true,
            prefix: "test",
        };
        const mso = {
            key: {
                subkey: String,
                value: String },
            value: { type: String, required: true },
        };
        model = new RedisModel("Test" + "Model",
            settings,
            new Validator("TestRedisValidator", mso));
        const testdata = {
            key: {
                subkey: "testkey2",
                value: "testdata2",
            },
        };
        expect(model.save("key.subkey", testdata)).to.be.rejected;
    });

    it("should properly delete all data", async () => {
        settings = {
            isKeyConstructedFromData: false,
            prefix: "test",
        };
        model = new RedisModel("Test" + "Model",
            settings,
            null);
        await model.truncate();
        expect(await connection.keys("*")).to.be.an("array").that.does.not.include("test");
    });

});
