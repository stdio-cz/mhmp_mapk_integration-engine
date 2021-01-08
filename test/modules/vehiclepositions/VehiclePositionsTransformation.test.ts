"use strict";

import { VehiclePositions } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { VehiclePositionsTransformation } from "../../../src/modules/vehiclepositions";

chai.use(chaiAsPromised);
import * as fs from "fs";

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
    let positionsValidator;
    let stopsValidator;
    let tripsValidator;

    before(() => {
        positionsValidator = new Validator(VehiclePositions.positions.name + "ModelValidator",
            VehiclePositions.positions.outputMongooseSchemaObject);
        stopsValidator = new Validator(VehiclePositions.positions.name + "ModelValidator",
            VehiclePositions.positions.outputMongooseSchemaObject);
        tripsValidator = new Validator(VehiclePositions.trips.name + "ModelValidator",
            VehiclePositions.trips.outputMongooseSchemaObject);
    });

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

    it("should properly transform element (negative bearing)", async () => {
        const data = await transformation.transform(testSourceData.m.spoj[0]);
        expect(data).to.have.property("positions");
        expect(data.positions[0]).to.have.property("lat", 50.16252);
        expect(data.positions[0]).to.have.property("lng", 14.52483);
        expect(data.positions[0]).to.have.property("bearing", -10 + 256);
        expect(data).to.have.property("stops");
        expect(data.stops.length).to.equal(28);
        expect(data).to.have.property("trips");
        expect(data.trips[0]).to.have.property("cis_line_id", "100110");
    });

    it("should properly transform element (positive bearing)", async () => {
        const data = await transformation.transform(testSourceData.m.spoj[1]);
        expect(data).to.have.property("positions");
        expect(data.positions[0]).to.have.property("lat", 50.1053);
        expect(data.positions[0]).to.have.property("lng", 14.54619);
        expect(data.positions[0]).to.have.property("bearing", 114);
        expect(data).to.have.property("stops");
        expect(data.stops.length).to.equal(24);
        expect(data).to.have.property("trips");
        expect(data.trips[0]).to.have.property("cis_line_id", "100110");
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData.m.spoj);
        await expect(positionsValidator.Validate(data.positions)).to.be.fulfilled;
        await expect(stopsValidator.Validate(data.stops)).to.be.fulfilled;
        await expect(tripsValidator.Validate(data.trips)).to.be.fulfilled;

        expect(data).to.have.property("positions");
        expect(data.positions.length).to.equal(324);
        expect(data).to.have.property("stops");
        expect(data.stops.length).to.equal(5925);
        expect(data).to.have.property("trips");
        expect(data.trips.length).to.equal(324);
    });

    it("should properly transform DPP stop id (to AWS id)", async () => {
        const data = await transformation.transform(testSourceData.m.spoj[2]);
        expect(data.trips[0]).to.have.property("agency_name_real", "DP PRAHA");
        expect(data.trips[0]).to.have.property("start_asw_stop_id", "628/4");
        expect(data).to.have.property("positions");
        // expect(data.positions[0]).to.have.property("asw_last_stop_id", "628/4");
        expect(data).to.have.property("stops");
        expect(data.stops.length).to.equal(2);
        expect(data.stops[0]).to.have.property("asw_stop_id", "628/4");
        expect(data.stops[1]).to.have.property("asw_stop_id", "1090/3");
    });

});
