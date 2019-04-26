/// <reference path="../../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import { getSubProperty } from "../../../src/core/helpers";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

describe("ObjectUtils", () => {

    it("should returns the same object", () => {
        expect(getSubProperty("", { property1: 1 })).to.deep.equal({ property1: 1 });
    });

    it("should returns the sub property of object", () => {
        expect(getSubProperty("property1", { property1: 1 })).to.equal(1);
    });

    it("should returns the sub sub property of object", () => {
        expect(getSubProperty("property1.a", { property1: { a: 1 } })).to.equal(1);
    });

    it("should returns undefined", () => {
        expect(getSubProperty("property1.b", { property1: { a: 1 } })).to.equal(undefined);
    });

});
