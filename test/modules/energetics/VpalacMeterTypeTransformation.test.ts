"use strict";

import { Energetics } from "@golemio/schema-definitions";
import * as fs from "fs";
import { JSONSchemaValidator } from "@golemio/validator";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { VpalacMeterTypeTransformation } from "../../../src/modules/energetics";

chai.use(chaiAsPromised);

describe("VpalacMeterTypeTransformation", () => {

    let transformation;
    let testSourceData;
    let validator;

    before(() => {
        validator = new JSONSchemaValidator(Energetics.vpalac.meterType.name + "ModelPostgresValidator",
            Energetics.vpalac.meterType.outputJsonSchema);
    });

    beforeEach(() => {
        transformation = new VpalacMeterTypeTransformation();
        const rawData = fs.readFileSync(__dirname + "/../../data/energetics-vpalac-metertype-datasource.json") as unknown;
        testSourceData = JSON.parse(rawData as string);
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("EnergeticsVpalacMeterType");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);

        for (let i = 0, imax = data.length; i < imax; i++) {
            await expect(validator.Validate(data[i])).to.be.fulfilled;
            expect(data[i]).to.have.property("fir_id");
            expect(data[i]).to.have.property("medium");
            expect(data[i]).to.have.property("met_druh");
            expect(data[i]).to.have.property("met_id");
            expect(data[i]).to.have.property("met_kod");
            expect(data[i]).to.have.property("met_nazev");
            expect(data[i]).to.have.property("met_ziv");
            expect(data[i]).to.have.property("vyr_zkr");
        }
    });

});
