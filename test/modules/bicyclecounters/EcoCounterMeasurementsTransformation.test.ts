"use strict";

import { BicycleCounters } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { EcoCounterMeasurementsTransformation } from "../../../src/modules/bicyclecounters";

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

describe("EcoCounterMeasurementsTransformation", () => {

    let transformation;
    let testSourceData;
    let detectionsValidator;
    let temperatureValidator;

    before(() => {
        detectionsValidator = new Validator(BicycleCounters.detections.name + "ModelValidator",
            BicycleCounters.detections.outputMongooseSchemaObject);
        temperatureValidator = new Validator(BicycleCounters.temperatures.name + "ModelValidator",
            BicycleCounters.temperatures.outputMongooseSchemaObject);
    });

    beforeEach(async () => {
        transformation = new EcoCounterMeasurementsTransformation();
        const buffer = await readFile(__dirname +
            "/../../data/bicyclecounters-ecocounter-measurements-datasource.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("EcoCounterBicycleCountersMeasurements");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.transform(testSourceData[0]);
        data.directions_id = "ecoCounter-103047647";
        data.locations_id = "ecoCounter-100047647";

        await expect(detectionsValidator.Validate(data)).to.be.fulfilled;
    });

    it("should properly transform collection", async () => {
        let data = await transformation.transform(testSourceData);
        data = data
            .map((x) => {
                x.directions_id = "ecoCounter-103047647";
                x.locations_id = "ecoCounter-100047647";
                return x;
            });

        await expect(detectionsValidator.Validate(data)).to.be.fulfilled;
    });

});
