/// <reference path="../../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import { log } from "../../../src/core/helpers";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

describe("Logger", () => {

    it("should has silly method", () => {
        expect(log.silly).not.to.be.undefined;
    });

    it("should has debug method", () => {
        expect(log.debug).not.to.be.undefined;
    });

    it("should has verbose method", () => {
        expect(log.verbose).not.to.be.undefined;
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

});
