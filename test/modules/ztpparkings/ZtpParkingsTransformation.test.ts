"use strict";

import * as chai from "chai";
import { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import "mocha";
import { ZtpParkingsTransformation } from "../../../src/modules/ztpparkings";

chai.use(chaiAsPromised);
import fs from "fs";

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

describe("ZtpParkingsTransformation", () => {

    let transformation;
    let testSourceData;

    beforeEach(async () => {
        transformation = new ZtpParkingsTransformation();
        const buffer = await readFile(__dirname + "/../../data/ztpparkings-datasource.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("ZtpParkings");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform element with object keys", async () => {
        const data = await transformation.transform(testSourceData);
        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[i]).to.have.property("geometry");
            expect(data[i]).to.have.property("properties");
            expect(data[i]).to.have.property("type");
            expect(data[i].properties).to.have.property("active");
            expect(data[i].properties).to.have.property("device_id");
            expect(data[i].properties).to.have.property("failure");
            expect(data[i].properties).to.have.property("group");
            expect(data[i].properties).to.have.property("id");
            expect(data[i].properties).to.have.property("id_group");
            expect(data[i].properties).to.have.property("id_park");
            expect(data[i].properties).to.have.property("id_space");
            expect(data[i].properties).to.have.property("image_name");
            expect(data[i].properties).to.have.property("image_src");
            expect(data[i].properties).to.have.property("last_updated_at");
            expect(data[i].properties).to.have.property("location");
            expect(data[i].properties).to.have.property("master");
            expect(data[i].properties).to.have.property("note");
            expect(data[i].properties).to.have.property("occupied");
            expect(data[i].properties).to.have.property("signal_rssi0");
            expect(data[i].properties).to.have.property("signal_rssi1");
            expect(data[i].properties).to.have.property("size");
            expect(data[i].properties).to.have.property("source");
            expect(data[i].properties).to.have.property("surface");
            expect(data[i].properties).to.have.property("temperature");
            expect(data[i].properties).to.have.property("type");
            expect(data[i].properties).to.have.property("updated_at");
        }
    });

    describe("history", () => {

        let testTransformedData;

        beforeEach(async () => {
            transformation = new ZtpParkingsTransformation();
            const buffer = await readFile(__dirname + "/../../data/ztpparkings-transformed.json");
            testTransformedData = JSON.parse(Buffer.from(buffer).toString("utf8"));
        });

        it("should have transformHistory method", async () => {
            expect(transformation.transformHistory).not.to.be.undefined;
        });

        it("should properly transform element", async () => {
            const data = await transformation.transformHistory(testTransformedData[0]);
            expect(data).to.have.property("failure");
            expect(data).to.have.property("id");
            expect(data).to.have.property("last_updated_at");
            expect(data).to.have.property("occupied");
            expect(data).to.have.property("updated_at");
        });

        it("should properly transform collection", async () => {
            const data = await transformation.transformHistory(testTransformedData);
            for (let i = 0, imax = data.length; i < imax; i++) {
                expect(data[i]).to.have.property("failure");
                expect(data[i]).to.have.property("id");
                expect(data[i]).to.have.property("last_updated_at");
                expect(data[i]).to.have.property("occupied");
                expect(data[i]).to.have.property("updated_at");
            }
        });

    });

});
