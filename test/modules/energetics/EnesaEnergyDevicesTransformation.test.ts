"use strict";

import { Energetics } from "@golemio/schema-definitions";
import * as fs from "fs";
import { JSONSchemaValidator } from "@golemio/validator";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { EnesaEnergyDevicesTransformation } from "../../../src/modules/energetics";

chai.use(chaiAsPromised);

describe("EnesaEnergyDevicesTransformation", () => {
    let transformation;
    let testSourceData;
    let validator;

    before(() => {
        validator = new JSONSchemaValidator(Energetics.enesa.devices.name + "ModelPostgresValidator",
            Energetics.enesa.devices.outputJsonSchema);
    });

    beforeEach(() => {
        transformation = new EnesaEnergyDevicesTransformation();
        const rawData = fs.readFileSync(__dirname + "/../../data/energetics-enesa-energy-devices-datasource.json") as unknown;
        testSourceData = JSON.parse(rawData as string);
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("EnergeticsEnesaDevices");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);

        for (let i = 0, imax = data.length; i < imax; i++) {
            await expect(validator.Validate(data[i])).to.be.fulfilled;
            Energetics.enesa.devices.outputJsonSchema.required.forEach((prop) => {
                expect(data[i]).to.have.property(prop);
            });
        }
    });
});
