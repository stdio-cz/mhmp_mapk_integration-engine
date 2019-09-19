"use strict";

import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { log } from "../../../src/core/helpers";

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
