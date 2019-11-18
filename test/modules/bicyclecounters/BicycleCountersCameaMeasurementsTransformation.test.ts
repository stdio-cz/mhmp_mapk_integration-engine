"use strict";

import { BicycleCounters } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { BicycleCountersCameaMeasurementsTransformation } from "../../../src/modules/bicyclecounters";

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

describe("BicycleCountersCameaMeasurementsTransformation", () => {

    let transformation;
    let testSourceData;
    let validator;

    before(() => {
        validator = new Validator(BicycleCounters.measurements.name + "ModelValidator",
            BicycleCounters.measurements.outputMongooseSchemaObject);
    });

    beforeEach(async () => {
        transformation = new BicycleCountersCameaMeasurementsTransformation();
        const buffer = await readFile(__dirname + "/../../data/bicyclecounters-camea-measurements-datasource.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("BicycleCountersCameaMeasurements");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.transform(testSourceData[0]);
        data.counter_id = "camea-BC_PP-ROJP";
        await expect(validator.Validate(data)).to.be.fulfilled;

        expect(data).to.have.property("directions");
        expect(data.directions).to.be.an("array");
        expect(data).to.have.property("measured_from");
        expect(data).to.have.property("measured_to");
        expect(data).to.have.property("temperature");
        expect(data).to.have.property("updated_at");
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);
        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[i]).to.have.property("directions");
            expect(data[i].directions).to.be.an("array");
            expect(data[i]).to.have.property("measured_from");
            expect(data[i]).to.have.property("measured_to");
            expect(data[i]).to.have.property("temperature");
            expect(data[i]).to.have.property("updated_at");
        }
    });

});
