/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import IceGatewaySensorsHistoryTransformation from "../../src/transformations/IceGatewaySensorsHistoryTransformation";

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

describe("IceGatewaySensorsHistoryTransformation", () => {

    let transformation;
    let testSourceData;

    beforeEach(async () => {
        transformation = new IceGatewaySensorsHistoryTransformation();
        const buffer = await readFile(__dirname + "/../data/icegatewaysensors-transformed.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("IceGatewaySensorsHistory");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.transform(testSourceData.features[0]);
        expect(data).to.have.property("id");
        expect(data).to.have.property("sensors");
        expect(data).to.have.property("timestamp");
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData.features);
        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[i]).to.have.property("id");
            expect(data[i]).to.have.property("sensors");
            expect(data[i]).to.have.property("timestamp");
        }
    });

});
