/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import * as path from "path";
import ParkingsTransformation from "../../src/transformations/ParkingsTransformation";

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

describe("ParkingsTransformation", () => {

    let pipeline;
    let testSourceData;

    beforeEach(() => {
        pipeline = new ParkingsTransformation();
        beforeEach(async () => {
            const buffer = await fs.readFileAsync(__dirname + "/../data/parkings-datasource.json");
            testSourceData = JSON.parse(buffer.toString());
        });
    });

    it("should has name", async () => {
        expect(pipeline.name).not.to.be.undefined;
        expect(pipeline.name).is.equal("Parkings");
    });

    it("should has TransformDataElement method", async () => {
        expect(pipeline.TransformDataElement).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await pipeline.TransformDataElement(testSourceData.results[0]);
        expect(data).to.have.property("geometry");
        expect(data).to.have.property("properties");
        expect(data).to.have.property("type");
        expect(data.properties).to.have.property("id");
        expect(data.properties).to.have.property("name");
        expect(data.properties).to.have.property("num_of_free_places");
        expect(data.properties).to.have.property("num_of_taken_places");
        expect(data.properties).to.have.property("parking_type");
        expect(data.properties.parking_type).to.have.property("description");
        expect(data.properties.parking_type).to.have.property("id");
        expect(data.properties).to.have.property("timestamp");
        expect(data.properties).to.have.property("total_num_of_places");
    });

    it("should has TransformDataCollection method", async () => {
        expect(pipeline.TransformDataCollection).not.to.be.undefined;
    });

    it("should properly transform collection", async () => {
        const data = await pipeline.TransformDataCollection(testSourceData.results);
        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[i]).to.have.property("geometry");
            expect(data[i]).to.have.property("properties");
            expect(data[i]).to.have.property("type");
            expect(data[i].properties).to.have.property("id");
            expect(data[i].properties).to.have.property("name");
            expect(data[i].properties).to.have.property("num_of_free_places");
            expect(data[i].properties).to.have.property("num_of_taken_places");
            expect(data[i].properties).to.have.property("parking_type");
            expect(data[i].properties.parking_type).to.have.property("description");
            expect(data[i].properties.parking_type).to.have.property("id");
            expect(data[i].properties).to.have.property("timestamp");
            expect(data[i].properties).to.have.property("total_num_of_places");
        }
    });

});
