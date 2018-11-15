/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import GeocodeApi from "../../src/helpers/GeocodeApi";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

describe("GeocodeApi", () => {

    it("should has getAddressByLatLng method", async () => {
        expect(GeocodeApi.getAddressByLatLng).not.to.be.undefined;
    });

    it("should returns address by lat lng using Open Street Map API", async () => {
        const data = await GeocodeApi.getAddressByLatLng(50.102864, 14.445868);
        expect(data).to.be.a("string");
        expect(data).to.equal("Dělnická 213/10, 17000 Praha-Holešovice, Česko");
    });

});
