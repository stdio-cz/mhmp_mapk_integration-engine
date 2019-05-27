/// <reference path="../../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import { TrafficCamerasTransformation } from "../../../src/modules/trafficcameras";

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

describe("TrafficCamerasTransformation", () => {

    let transformation;
    let testSourceData;

    beforeEach(async () => {
        transformation = new TrafficCamerasTransformation();
        const buffer = await readFile(__dirname + "/../../data/trafficcameras-datasource.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("TrafficCameras");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.transform(testSourceData.results[0]);
        expect(data).to.have.property("geometry");
        expect(data).to.have.property("properties");
        expect(data).to.have.property("type");
        expect(data.properties).to.have.property("id");
        expect(data.properties).to.have.property("image");
        expect(data.properties.image).to.have.property("file_size");
        expect(data.properties.image).to.have.property("url");
        expect(data.properties).to.have.property("last_updated");
        expect(data.properties).to.have.property("name");
        expect(data.properties).to.have.property("updated_at");
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData.results);
        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[i]).to.have.property("geometry");
            expect(data[i]).to.have.property("properties");
            expect(data[i]).to.have.property("type");
            expect(data[i].properties).to.have.property("id");
            expect(data[i].properties).to.have.property("image");
            expect(data[i].properties.image).to.have.property("file_size");
            expect(data[i].properties.image).to.have.property("url");
            expect(data[i].properties).to.have.property("last_updated");
            expect(data[i].properties).to.have.property("name");
            expect(data[i].properties).to.have.property("updated_at");
        }
    });

    describe("history", () => {

        let testTransformedData;

        beforeEach(async () => {
            transformation = new TrafficCamerasTransformation();
            const buffer = await readFile(__dirname + "/../../data/trafficcameras-transformed.json");
            testTransformedData = JSON.parse(Buffer.from(buffer).toString("utf8"));
        });

        it("should has transformHistory method", async () => {
            expect(transformation.transformHistory).not.to.be.undefined;
        });

        it("should properly transform element", async () => {
            const data = await transformation.transformHistory(testTransformedData[0]);
            expect(data).to.have.property("id");
            expect(data).to.have.property("image");
            expect(data.image).to.have.property("file_size");
            expect(data.image).to.have.property("url");
            expect(data).to.have.property("last_updated");
            expect(data).to.have.property("updated_at");
        });

        it("should properly transform collection", async () => {
            const data = await transformation.transformHistory(testTransformedData);
            for (let i = 0, imax = data.length; i < imax; i++) {
                expect(data[i]).to.have.property("id");
                expect(data[i]).to.have.property("image");
                expect(data[i].image).to.have.property("file_size");
                expect(data[i].image).to.have.property("url");
                expect(data[i]).to.have.property("last_updated");
                expect(data[i]).to.have.property("updated_at");
            }
        });

    });

});
