"use strict";

import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { config, ConfigLoader } from "../../../src/core/config";

chai.use(chaiAsPromised);

describe("ConfigLoader", () => {

    it("should load config from file", () => {
        const conf = () => new ConfigLoader("datasources");
        expect(conf).to.not.throw();
    });

    it("should throws Error if config file is not found", () => {
        const conf = () => new ConfigLoader("test");
        expect(conf).to.throw();
    });

    it("should properly load all configurations", () => {
        // datasources config file
        expect(config.datasources.TSKParkings).to.be.equal("http://www.tsk-praha.cz/tskexport3/json/parkings");
        // env variables
        expect(config.MONGO_CONN).is.not.null;
    });

});
