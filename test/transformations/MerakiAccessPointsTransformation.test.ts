/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import MerakiAccessPointsTransformation from "../../src/transformations/MerakiAccessPointsTransformation";

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

describe("MerakiAccessPointsTransformation", () => {

    let transformation;
    let testSourceData;

    beforeEach(async () => {
        transformation = new MerakiAccessPointsTransformation();
        const buffer = await fs.readFileAsync(__dirname + "/../data/meraki-access-points-input.json");
        testSourceData = JSON.parse(buffer.toString());
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("MerakiAccessPoints");
    });

    it("should has TransformDataCollection method", async () => {
        expect(transformation.TransformDataCollection).not.to.be.undefined;
    });

    it("should properly transform collection", async () => {
        const data = await transformation.TransformDataCollection(testSourceData);
        expect(data).to.have.property("observations");
        expect(data).to.have.property("tags");
    });

});
