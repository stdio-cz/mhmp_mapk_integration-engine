/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import VehiclePositionsTransformation from "../../src/transformations/VehiclePositionsTransformation";

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
        const buffer = await readFile(__dirname + "/../data/vehiclepositions-input.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("VehiclePositions");
    });

    it("should has TransformDataElement method", async () => {
        expect(transformation.TransformDataElement).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.TransformDataElement(testSourceData.m.spoj[0]);
        expect(data).to.have.property("stops");
        expect(data).to.have.property("trip");
});

    it("should has TransformDataCollection method", async () => {
        expect(transformation.TransformDataCollection).not.to.be.undefined;
    });

    it("should properly transform collection", async () => {
        const data = await transformation.TransformDataCollection(testSourceData.m.spoj);
        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[i]).to.have.property("stops");
            expect(data[i]).to.have.property("trips");
        }
    });

});
