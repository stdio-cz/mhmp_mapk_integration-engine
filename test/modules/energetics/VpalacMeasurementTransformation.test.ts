"use strict";

import { Energetics } from "@golemio/schema-definitions";
import * as fs from "fs";
import { JSONSchemaValidator } from "@golemio/validator";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { VpalacMeasurementTransformation } from "../../../src/modules/energetics";

chai.use(chaiAsPromised);

describe("VpalacMeasurementTransformation", () => {

    let transformation;
    let testSourceData;
    let validator;

    before(() => {
        validator = new JSONSchemaValidator(Energetics.vpalac.measurement.name + "ModelPostgresValidator",
            Energetics.vpalac.measurement.outputJsonSchema);
    });

    beforeEach(() => {
        transformation = new VpalacMeasurementTransformation();
        const rawData = fs.readFileSync(__dirname + "/../../data/energetics-vpalac-measurement-datasource.json") as unknown;
        testSourceData = JSON.parse(rawData as string);
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("EnergeticsVpalacMeasurement");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);

        for (let i = 0, imax = data.length; i < imax; i++) {
            await expect(validator.Validate(data[i])).to.be.fulfilled;
            expect(data[i]).to.have.property("time_measurement");
            expect(data[i]).to.have.property("value");
            expect(data[i]).to.have.property("var_id");
        }
    });

});
