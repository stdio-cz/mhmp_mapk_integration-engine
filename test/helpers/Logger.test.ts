/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import log from "../../src/helpers/Logger";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

const config = require("../../src/config/ConfigLoader");

describe("Logger", () => {

    let defaultLogLevel;

    beforeEach(() => {
        defaultLogLevel = config.LOG_LEVEL;
    });

    afterEach(() => {
        config.LOG_LEVEL = defaultLogLevel;
    });

    it("should has debug method", () => {
        expect(log.debug).not.to.be.undefined;
    });

    it("should has info method", () => {
        expect(log.info).not.to.be.undefined;
    });

    it("should has warn method", () => {
        expect(log.warn).not.to.be.undefined;
    });

    it("should has error method", () => {
        expect(log.error).not.to.be.undefined;
    });

    it("should has fatal method", async () => {
        expect(log.fatal).not.to.be.undefined;
    });

    describe("debug method", () => {

        it("should returns true if LOG_LEVEL is 'ALL' or 'DEBUG'", () => {
            config.LOG_LEVEL = "ALL";
            expect(log.debug("test")).to.be.true;
            config.LOG_LEVEL = "DEBUG";
            expect(log.debug("test")).to.be.true;
        });

        it("should returns false if LOG_LEVEL is 'INFO', 'WARN', 'ERROR', 'FATAL' or 'OFF'", () => {
            config.LOG_LEVEL = "INFO";
            expect(log.debug("test")).to.be.false;
            config.LOG_LEVEL = "WARN";
            expect(log.debug("test")).to.be.false;
            config.LOG_LEVEL = "ERROR";
            expect(log.debug("test")).to.be.false;
            config.LOG_LEVEL = "FATAL";
            expect(log.debug("test")).to.be.false;
            config.LOG_LEVEL = "OFF";
            expect(log.debug("test")).to.be.false;
        });
    });

    describe("info method", () => {

        it("should returns true if LOG_LEVEL is 'ALL', 'DEBUG' or 'INFO'", () => {
            config.LOG_LEVEL = "ALL";
            expect(log.info("test")).to.be.true;
            config.LOG_LEVEL = "DEBUG";
            expect(log.info("test")).to.be.true;
            config.LOG_LEVEL = "INFO";
            expect(log.info("test")).to.be.true;
        });

        it("should returns false if LOG_LEVEL is 'WARN', 'ERROR', 'FATAL' or 'OFF'", () => {
            config.LOG_LEVEL = "WARN";
            expect(log.info("test")).to.be.false;
            config.LOG_LEVEL = "ERROR";
            expect(log.info("test")).to.be.false;
            config.LOG_LEVEL = "FATAL";
            expect(log.info("test")).to.be.false;
            config.LOG_LEVEL = "OFF";
            expect(log.info("test")).to.be.false;
        });
    });

    describe("warn method", () => {

        it("should returns true if LOG_LEVEL is 'ALL', 'DEBUG', 'INFO' or 'WARN'", () => {
            config.LOG_LEVEL = "ALL";
            expect(log.warn("test")).to.be.true;
            config.LOG_LEVEL = "DEBUG";
            expect(log.warn("test")).to.be.true;
            config.LOG_LEVEL = "INFO";
            expect(log.warn("test")).to.be.true;
            config.LOG_LEVEL = "WARN";
            expect(log.warn("test")).to.be.true;
        });

        it("should returns false if LOG_LEVEL is 'ERROR', 'FATAL' or 'OFF'", () => {
            config.LOG_LEVEL = "ERROR";
            expect(log.warn("test")).to.be.false;
            config.LOG_LEVEL = "FATAL";
            expect(log.warn("test")).to.be.false;
            config.LOG_LEVEL = "OFF";
            expect(log.warn("test")).to.be.false;
        });
    });

    describe("error method", () => {

        it("should returns true if LOG_LEVEL is 'ALL', 'DEBUG', 'INFO', 'WARN' or 'ERROR'", () => {
            config.LOG_LEVEL = "ALL";
            expect(log.error("test")).to.be.true;
            config.LOG_LEVEL = "DEBUG";
            expect(log.error("test")).to.be.true;
            config.LOG_LEVEL = "INFO";
            expect(log.error("test")).to.be.true;
            config.LOG_LEVEL = "WARN";
            expect(log.error("test")).to.be.true;
            config.LOG_LEVEL = "ERROR";
            expect(log.error("test")).to.be.true;
        });

        it("should returns false if LOG_LEVEL is 'FATAL' or 'OFF'", () => {
            config.LOG_LEVEL = "FATAL";
            expect(log.error("test")).to.be.false;
            config.LOG_LEVEL = "OFF";
            expect(log.error("test")).to.be.false;
        });
    });

    describe("fatal method", () => {

        it("should returns true if LOG_LEVEL is 'ALL', 'DEBUG', 'INFO', 'WARN', 'ERROR' or 'FATAL'", () => {
            config.LOG_LEVEL = "ALL";
            expect(log.fatal("test")).to.be.true;
            config.LOG_LEVEL = "DEBUG";
            expect(log.fatal("test")).to.be.true;
            config.LOG_LEVEL = "INFO";
            expect(log.fatal("test")).to.be.true;
            config.LOG_LEVEL = "WARN";
            expect(log.fatal("test")).to.be.true;
            config.LOG_LEVEL = "ERROR";
            expect(log.fatal("test")).to.be.true;
            config.LOG_LEVEL = "FATAL";
            expect(log.fatal("test")).to.be.true;
        });

        it("should returns false if LOG_LEVEL is 'OFF'", () => {
            config.LOG_LEVEL = "OFF";
            expect(log.fatal("test")).to.be.false;
        });
    });
});
