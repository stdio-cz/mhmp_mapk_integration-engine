"use strict";

import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { RopidGTFSCisStopsTransformation } from "../../../src/modules/ropidgtfs";

chai.use(chaiAsPromised);
import * as fs from "fs";

const readFile = (file: string): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(file);
        const chunks = [];

        stream.on("error", (err) => {
            reject(err);
        });
        stream.on("data", (data) => {
            chunks.push(data);
        });
        stream.on("close", () => {
            resolve(Buffer.concat(chunks));
        });
    });
};

describe("RopidGTFSCisStopsTransformation", () => {

    let transformation;
    let testSourceData;

    beforeEach(async () => {
        transformation = new RopidGTFSCisStopsTransformation();
        const buffer = await readFile(__dirname + "/../../data/ropidgtfsstops-datasource.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("RopidGTFSCisStops");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.transform(testSourceData);
        expect(data).to.have.property("cis_stop_groups");
        expect(data).to.have.property("cis_stops");
    });

});