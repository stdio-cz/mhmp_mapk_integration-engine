/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import * as path from "path";
import GeocodeApi from "../../src/helpers/GeocodeApi";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

const debug = require("debug");
const dotenv = require("dotenv");

describe("GeocodeApi", () => {

    before(() => {
        const env = dotenv.config({ path: path.resolve(process.cwd(), "config/.env") });
        debug.enable(process.env.DEBUG);

        if (env.error) {
            dotenv.config({ path: path.resolve(process.cwd(), "config/.env.default") });
            debug.enable(process.env.DEBUG);
        }
    });

    it("should has getAddressByLatLng method", async () => {
        expect(GeocodeApi.getAddressByLatLng).not.to.be.undefined;
    });

    it("should returns address by lat lng using Open Street Map API", async () => {
        const data = await GeocodeApi.getAddressByLatLng(50.102864, 14.445868);
        expect(data).to.be.a("string");
        expect(data).to.equal("Dělnická 213/10, 17000 Praha-Holešovice, Česko");
    });

});
