/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import RopidGTFSStopsTransformation from "../../src/transformations/RopidGTFSStopsTransformation";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
const fs = require("fs");

chai.use(chaiAsPromised);

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

describe("RopidGTFSStopsTransformation", () => {

    let transformation;
    let testSourceData;

    beforeEach(async () => {
        transformation = new RopidGTFSStopsTransformation();
        const buffer = await readFile(__dirname + "/../data/ropidgtfsstops-datasource.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("RopidGTFSStops");
    });

    it("should has TransformDataCollection method", async () => {
        expect(transformation.TransformDataCollection).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.TransformDataCollection(testSourceData);
        expect(data).to.have.property("cis_stop_groups");
        expect(data).to.have.property("cis_stops");
    });

});
