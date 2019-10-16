"use strict";

import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as fs from "fs";
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

    it("should properly replace default conf by specific conf", () => {
        fs.writeFileSync(__dirname + "/../../../config/repltest.default.json", JSON.stringify({
            a: 1,
            b: 2,
        }));
        fs.writeFileSync(__dirname + "/../../../config/repltest.json", JSON.stringify({
            a: 3,
            c: 1,
            d: 2,
        }));

        let conf = new ConfigLoader("repltest").conf;
        expect(conf.a).to.equal(3);
        expect(conf.b).to.equal(2);
        expect(conf.c).to.equal(1);
        expect(conf.d).to.equal(2);

        conf = new ConfigLoader("repltest", true).conf;
        expect(conf.a).to.equal(3);
        expect(conf.b).to.be.undefined;
        expect(conf.c).to.equal(1);
        expect(conf.d).to.equal(2);

        fs.writeFileSync(__dirname + "/../../../config/repltest2.default.json", JSON.stringify({
            a: 1,
            b: 2,
        }));

        conf = new ConfigLoader("repltest2", true).conf;
        expect(conf.a).to.equal(1);
        expect(conf.b).to.equal(2);

        fs.unlinkSync(__dirname + "/../../../config/repltest.json");
        fs.unlinkSync(__dirname + "/../../../config/repltest.default.json");
        fs.unlinkSync(__dirname + "/../../../config/repltest2.default.json");
    });

});
