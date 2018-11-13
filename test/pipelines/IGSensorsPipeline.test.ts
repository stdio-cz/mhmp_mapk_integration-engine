/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import IGSensorsPipeline from "../../src/pipelines/IGSensorsPipeline";

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

describe("IGSensorsPipeline", () => {

    let pipeline;
    let testSourceData;

    beforeEach(() => {
        pipeline = new IGSensorsPipeline();
        beforeEach(async () => {
            const buffer = await fs.readFileAsync(__dirname + "/../data/ig-sensors-datasource.json");
            testSourceData = JSON.parse(buffer.toString());
        });
    });

    it("should has name", async () => {
        expect(pipeline.name).not.to.be.undefined;
        expect(pipeline.name).is.equal("IGSensors");
    });

    it("should has TransformDataElement method", async () => {
        expect(pipeline.TransformDataElement).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await pipeline.TransformDataElement(testSourceData[0]);
        expect(data).to.have.property("geometry");
        expect(data).to.have.property("properties");
        expect(data).to.have.property("type");
        expect(data.properties).to.have.property("id");
        expect(data.properties).to.have.property("sensors");
        expect(data.properties).to.have.property("timestamp");
    });

    it("should has TransformDataCollection method", async () => {
        expect(pipeline.TransformDataCollection).not.to.be.undefined;
    });

    it("should properly transform collection", async () => {
        const data = await pipeline.TransformDataCollection(testSourceData);
        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[i]).to.have.property("geometry");
            expect(data[i]).to.have.property("properties");
            expect(data[i]).to.have.property("type");
            expect(data[i].properties).to.have.property("id");
            expect(data[i].properties).to.have.property("sensors");
            expect(data[i].properties).to.have.property("timestamp");
        }
    });

});
