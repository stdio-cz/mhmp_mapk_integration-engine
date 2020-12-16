"use strict";

import { Energetics } from "@golemio/schema-definitions";
import * as fs from "fs";
import { JSONSchemaValidator } from "@golemio/validator";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { EnesaEnergyConsumptionTransformation } from "../../../src/modules/energetics";

chai.use(chaiAsPromised);

describe("EnesaEnergyConsumptionTransformation", () => {
    let transformation;
    let testSourceData;
    let validator;

    before(() => {
        validator = new JSONSchemaValidator(Energetics.enesa.consumption.name + "ModelPostgresValidator",
            Energetics.enesa.consumption.outputJsonSchema);
    });

    beforeEach(() => {
        transformation = new EnesaEnergyConsumptionTransformation();
        const buffer = fs.readFileSync(__dirname + "/../../data/energetics-enesa-energy-consumption-datasource.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("EnergeticsEnesaConsumption");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);

        for (let i = 0, imax = data.length; i < imax; i++) {
            await expect(validator.Validate(data[i])).to.be.fulfilled;
            Energetics.enesa.consumption.outputJsonSchema.required.forEach((prop) => {
                expect(data[i]).to.have.property(prop);
            });
        }
    });
});
