/// <reference path="../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import ParkingZonesTransformation from "../../src/transformations/ParkingZonesTransformation";

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

describe("ParkingZonesTransformation", () => {

    let transformation;
    let testSourceData;
    let testTariffData;

    beforeEach(async () => {
        transformation = new ParkingZonesTransformation();
        let buffer = await readFile(__dirname + "/../data/parkingzones-datasource.json");
        testSourceData = JSON.parse(buffer.toString());
        buffer = await readFile(__dirname + "/../data/parkingzones_tariffs-datasource.json");
        testTariffData = JSON.parse(buffer.toString());
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("ParkingZones");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should has setTariffs method", async () => {
        expect(transformation.transformTariffs).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.transform(testSourceData.features[0]);
        expect(data).to.have.property("geometry");
        expect(data).to.have.property("properties");
        expect(data).to.have.property("type");
        expect(data.properties).to.have.property("code");
        expect(data.properties).to.have.property("midpoint");
        expect(data.properties).to.have.property("northeast");
        expect(data.properties).to.have.property("southwest");
        expect(data.properties).to.have.property("name");
        expect(data.properties).to.have.property("number_of_places");
        expect(data.properties).to.have.property("payment_link");
        expect(data.properties).to.have.property("timestamp");
        expect(data.properties).to.have.property("type");
        expect(data.properties).to.have.property("zps_id");
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData.features);
        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[i]).to.have.property("geometry");
            expect(data[i]).to.have.property("properties");
            expect(data[i]).to.have.property("type");
            expect(data[i].properties).to.have.property("code");
            expect(data[i].properties).to.have.property("midpoint");
            expect(data[i].properties).to.have.property("northeast");
            expect(data[i].properties).to.have.property("southwest");
            expect(data[i].properties).to.have.property("name");
            expect(data[i].properties).to.have.property("number_of_places");
            expect(data[i].properties).to.have.property("payment_link");
            expect(data[i].properties).to.have.property("timestamp");
            expect(data[i].properties).to.have.property("type");
            expect(data[i].properties).to.have.property("zps_id");
        }
    });

    it("should properly transform tariffs", async () => {
        const data = await transformation.transformTariffs("test", testTariffData);
        expect(data).to.have.property("tariffs");
        expect(data).to.have.property("tariffsText");
    });

});
