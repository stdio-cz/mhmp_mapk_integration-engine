/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import VehiclePositionsTransformation from "../../src/transformations/VehiclePositionsTransformation";

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

describe("VehiclePositionsTransformation", () => {

    let transformation;
    let testSourceData;

    beforeEach(async () => {
        transformation = new VehiclePositionsTransformation();
        const buffer = await fs.readFileAsync(__dirname + "/../data/vehicle-positions-input.json");
        testSourceData = JSON.parse(buffer.toString());
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