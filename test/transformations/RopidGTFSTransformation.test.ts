/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import RopidGTFSTransformation from "../../src/transformations/RopidGTFSTransformation";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
const fs = require("fs");

chai.use(chaiAsPromised);

fs.readFileAsync = (filename) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
};

describe("RopidGTFSTransformation", () => {

    let transformation;
    let testSourceData;

    beforeEach(async () => {
        transformation = new RopidGTFSTransformation();
        const buffer = await fs.readFileAsync(__dirname + "/../data/ropid-gtfs-data.json");
        testSourceData = JSON.parse(buffer.toString());
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("RopidGTFS");
    });

    it("should has TransformDataElement method", async () => {
        expect(transformation.TransformDataElement).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.TransformDataElement(testSourceData);
        expect(data).to.have.property("name");
        expect(data).to.have.property("data");
    });

});