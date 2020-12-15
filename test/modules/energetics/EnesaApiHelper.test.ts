"use strict";

import "mocha";
import { expect } from "chai";

import { EnesaApi } from "../../../src/modules/energetics";

describe("EnesaApiHelper", () => {
    it("resourceType getter should return an object", () => {
        expect(Object.keys(EnesaApi.resourceType)).to.equal([
            ["Devices"],
        ]);
    });
});
