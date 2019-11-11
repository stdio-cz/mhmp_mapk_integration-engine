"use strict";

import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { BicycleCountersEcoCounterMeasurementsTransformation } from "../../../src/modules/bicyclecounters";

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

describe("BicycleCountersEcoCounterMeasurementsTransformation", () => {

    let transformation;
    let testSourceData;

    beforeEach(async () => {
        transformation = new BicycleCountersEcoCounterMeasurementsTransformation();
        const buffer = await readFile(__dirname +
            "/../../data/bicyclecounters-ecocounter-measurements-datasource.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("BicycleCountersEcoCounterMeasurements");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.transform(testSourceData[0]);
        expect(data).to.have.property("directions");
        expect(data.directions).to.be.an("array");
        expect(data).to.have.property("measured_from");
        expect(data).to.have.property("measured_from_iso");
        expect(data).to.have.property("measured_to");
        expect(data).to.have.property("measured_to_iso");
        expect(data).to.have.property("temperature");
        expect(data).to.have.property("updated_at");
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);
        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[i]).to.have.property("directions");
            expect(data[i].directions).to.be.an("array");
            expect(data[i]).to.have.property("measured_from");
            expect(data[i]).to.have.property("measured_from_iso");
            expect(data[i]).to.have.property("measured_to");
            expect(data[i]).to.have.property("measured_to_iso");
            expect(data[i]).to.have.property("temperature");
            expect(data[i]).to.have.property("updated_at");
        }
    });

});
