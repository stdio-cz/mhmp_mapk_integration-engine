/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import CityDistrictsPipeline from "../../src/pipelines/CityDistrictsPipeline";

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

describe("CityDistrictsPipeline", () => {

    let pipeline;
    let testSourceData;

    beforeEach(() => {
        pipeline = new CityDistrictsPipeline();
        beforeEach(async () => {
            const buffer = await fs.readFileAsync(__dirname + "/../data/city-districts-datasource.json");
            testSourceData = JSON.parse(buffer.toString());
        });
    });

    it("should has name", async () => {
        expect(pipeline.name).not.to.be.undefined;
        expect(pipeline.name).is.equal("CityDistricts");
    });

    it("should has TransformDataElement method", async () => {
        expect(pipeline.TransformDataElement).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await pipeline.TransformDataElement(testSourceData.features[0]);
        expect(data).to.have.property("id");
        expect(data).to.have.property("name");
        expect(data).to.have.property("slug");
        expect(data).to.have.property("loc");
        expect(data).to.have.property("timestamp");
    });

    it("should has TransformDataCollection method", async () => {
        expect(pipeline.TransformDataCollection).not.to.be.undefined;
    });

    it("should properly transform collection", async () => {
        const data = await pipeline.TransformDataCollection(testSourceData.features);
        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[i]).to.have.property("id");
            expect(data[i]).to.have.property("name");
            expect(data[i]).to.have.property("slug");
            expect(data[i]).to.have.property("loc");
            expect(data[i]).to.have.property("timestamp");
        }
    });

});
