/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import ParkingsHistoryTransformation from "../../src/transformations/ParkingsHistoryTransformation";

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

describe("ParkingsHistoryTransformation", () => {

    let transformation;
    let testSourceData;

    beforeEach(async () => {
        transformation = new ParkingsHistoryTransformation();
        const buffer = await fs.readFileAsync(__dirname + "/../data/parkings-response.json");
        testSourceData = JSON.parse(buffer.toString());
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("ParkingsHistory");
    });

    it("should has TransformDataElement method", async () => {
        expect(transformation.TransformDataElement).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.TransformDataElement(testSourceData.features[0]);
        expect(data).to.have.property("id");
        expect(data).to.have.property("num_of_free_places");
        expect(data).to.have.property("num_of_taken_places");
        expect(data).to.have.property("timestamp");
        expect(data).to.have.property("total_num_of_places");
    });

    it("should has TransformDataCollection method", async () => {
        expect(transformation.TransformDataCollection).not.to.be.undefined;
    });

    it("should properly transform collection", async () => {
        const data = await transformation.TransformDataCollection(testSourceData.features);
        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[i]).to.have.property("id");
            expect(data[i]).to.have.property("num_of_free_places");
            expect(data[i]).to.have.property("num_of_taken_places");
            expect(data[i]).to.have.property("timestamp");
            expect(data[i]).to.have.property("total_num_of_places");
        }
    });

});
