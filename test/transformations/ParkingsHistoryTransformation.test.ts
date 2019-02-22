/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import ParkingsHistoryTransformation from "../../src/transformations/ParkingsHistoryTransformation";

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

describe("ParkingsHistoryTransformation", () => {

    let transformation;
    let testSourceData;

    beforeEach(async () => {
        transformation = new ParkingsHistoryTransformation();
        const buffer = await readFile(__dirname + "/../data/parkings-transformed.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("ParkingsHistory");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.transform(testSourceData.features[0]);
        expect(data).to.have.property("id");
        expect(data).to.have.property("num_of_free_places");
        expect(data).to.have.property("num_of_taken_places");
        expect(data).to.have.property("timestamp");
        expect(data).to.have.property("total_num_of_places");
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData.features);
        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[i]).to.have.property("id");
            expect(data[i]).to.have.property("num_of_free_places");
            expect(data[i]).to.have.property("num_of_taken_places");
            expect(data[i]).to.have.property("timestamp");
            expect(data[i]).to.have.property("total_num_of_places");
        }
    });

});
