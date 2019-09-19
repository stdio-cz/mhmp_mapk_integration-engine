"use strict";

import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { VehiclePositionsTransformation } from "../../../src/modules/vehiclepositions";

chai.use(chaiAsPromised);
const fs = require("fs");

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

describe("VehiclePositionsTransformation", () => {

    let transformation;
    let testSourceData;

    beforeEach(async () => {
        transformation = new VehiclePositionsTransformation();
        const buffer = await readFile(__dirname + "/../../data/vehiclepositions-input.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("VehiclePositions");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.transform(testSourceData.m.spoj[0]);
        expect(data).to.have.property("positions");
        expect(data.positions[0]).to.have.property("lat", 50.16252);
        expect(data.positions[0]).to.have.property("lng", 14.52483);
        expect(data).to.have.property("stops");
        expect(data.stops.length).to.equal(28);
        expect(data).to.have.property("trips");
        expect(data.trips[0]).to.have.property("cis_id", 100110);
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData.m.spoj);
        expect(data).to.have.property("positions");
        expect(data.positions.length).to.equal(321);
        expect(data).to.have.property("stops");
        expect(data.stops.length).to.equal(5953);
        expect(data).to.have.property("trips");
        expect(data.trips.length).to.equal(321);
    });

});
