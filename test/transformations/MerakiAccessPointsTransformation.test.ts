/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import MerakiAccessPointsTransformation from "../../src/transformations/MerakiAccessPointsTransformation";

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

describe("MerakiAccessPointsTransformation", () => {

    let transformation;
    let testSourceData;

    beforeEach(async () => {
        transformation = new MerakiAccessPointsTransformation();
        const buffer = await readFile(__dirname + "/../data/merakiaccesspoints-input.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
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