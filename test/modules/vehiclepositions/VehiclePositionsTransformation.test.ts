/// <reference path="../../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import { VehiclePositionsTransformation } from "../../../src/modules/vehiclepositions";

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

describe("VehiclePositionsTransformation", () => {

    let transformation;
    let testSourceData;

    beforeEach(async () => {
        transformation = new VehiclePositionsTransformation();
        const buffer = await readFile(__dirname + "/../../data/vehiclepositions-input.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("VehiclePositions");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.transform(testSourceData.m.spoj[0]);
        expect(data).to.have.property("positions");
        expect(data).to.have.property("stops");
        expect(data).to.have.property("trips");
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData.m.spoj);
        expect(data).to.have.property("positions");
        expect(data).to.have.property("stops");
        expect(data).to.have.property("trips");
    });

});
