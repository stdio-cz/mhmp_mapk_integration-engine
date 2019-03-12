/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

const config = require("../../src/config/ConfigLoader");

describe("ConfigLoader", () => {

    it("should properly load config files", async () => {
        // datasources config file
        expect(config.datasources.TSKParkings).to.be.equal("http://www.tsk-praha.cz/tskexport3/json/parkings");
        // env variables
        expect(config.MONGO_CONN).is.not.null;
    });

});
