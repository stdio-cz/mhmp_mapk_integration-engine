/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import IGStreetLampsTransformation from "../../src/transformations/IGStreetLampsTransformation";

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

describe("IGStreetLampsTransformation", () => {

    let pipeline;
    let testSourceData;

    beforeEach(() => {
        pipeline = new IGStreetLampsTransformation();
        beforeEach(async () => {
            const buffer = await fs.readFileAsync(__dirname + "/../data/ig-street-lamps-datasource.json");
            testSourceData = JSON.parse(buffer.toString());
        });
    });

    it("should has name", async () => {
        expect(pipeline.name).not.to.be.undefined;
        expect(pipeline.name).is.equal("IGStreetLamps");
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
        expect(data.properties).to.have.property("dim_value");
        expect(data.properties).to.have.property("groups");
        expect(data.properties).to.have.property("lamppost_id");
        expect(data.properties).to.have.property("last_dim_override");
        expect(data.properties).to.have.property("state");
        expect(data.properties.state).to.have.property("description");
        expect(data.properties.state).to.have.property("id");
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
            expect(data[i].properties).to.have.property("dim_value");
            expect(data[i].properties).to.have.property("groups");
            expect(data[i].properties).to.have.property("lamppost_id");
            expect(data[i].properties).to.have.property("last_dim_override");
            expect(data[i].properties).to.have.property("state");
            expect(data[i].properties.state).to.have.property("description");
            expect(data[i].properties.state).to.have.property("id");
            expect(data[i].properties).to.have.property("timestamp");
        }
    });

});
