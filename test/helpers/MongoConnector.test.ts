/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
const { mongooseConnection } = require("../../src/helpers/MongoConnector");

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

describe("MongoConnector", () => {

    it("should connect to MongoDB", async () => {
        await expect(mongooseConnection).to.be.fulfilled;
    });

});