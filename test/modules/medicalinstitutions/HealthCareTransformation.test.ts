/// <reference path="../../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import { HealthCareTransformation } from "../../../src/modules/medicalinstitutions";

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

describe("HealthCareTransformation", () => {

    let transformation;
    let testSourceData;

    beforeEach(async () => {
        transformation = new HealthCareTransformation();
        const buffer = await readFile(__dirname + "/../../data/medicalinstitutions_healthcare-datasource.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("HealthCare");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);
        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[i]).to.have.property("geometry");
            expect(data[i]).to.have.property("properties");
            expect(data[i]).to.have.property("type");
            expect(data[i].properties).to.have.property("address");
            expect(data[i].properties.address).to.have.property("city");
            expect(data[i].properties.address).to.have.property("formatted");
            expect(data[i].properties.address).to.have.property("street");
            expect(data[i].properties.address).to.have.property("zip");
            expect(data[i].properties).to.have.property("id");
            expect(data[i].properties).to.have.property("institution_code");
            expect(data[i].properties).to.have.property("name");
            expect(data[i].properties).to.have.property("type");
            expect(data[i].properties.type).to.have.property("description");
            expect(data[i].properties.type).to.have.property("id");
            expect(data[i].properties).to.have.property("timestamp");
        }
    });

});
