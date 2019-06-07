/// <reference path="../../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import { ParkingsOccupanciesTransformation } from "../../../src/modules/parkings";

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

describe("ParkingsOccupanciesTransformation", () => {

    let transformation;
    let testSourceData;

    beforeEach(async () => {
        transformation = new ParkingsOccupanciesTransformation();
        const buffer = await readFile(__dirname + "/../../data/parkings_occupancies-input.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("ParkingsOccupancies");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);
        expect(data).to.have.property("capacity");
        expect(data).to.have.property("occupation");
        expect(data).to.have.property("parking_id");
        expect(data).to.have.property("reservedcapacity");
        expect(data).to.have.property("reservedoccupation");
    });

});
