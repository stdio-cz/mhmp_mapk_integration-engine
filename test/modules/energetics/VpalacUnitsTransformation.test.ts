"use strict";

import { Energetics } from "@golemio/schema-definitions";
import * as fs from "fs";
import { JSONSchemaValidator } from "@golemio/validator";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { VpalacUnitsTransformation } from "../../../src/modules/energetics";

chai.use(chaiAsPromised);

describe("VpalacUnitsTransformation", () => {

    let transformation;
    let testSourceData;
    let validator;

    before(() => {
        validator = new JSONSchemaValidator(Energetics.vpalac.units.name + "ModelPostgresValidator",
            Energetics.vpalac.units.outputJsonSchema);
    });

    beforeEach(() => {
        transformation = new VpalacUnitsTransformation();
        const buffer = fs.readFileSync(__dirname + "/../../data/energetics-vpalac-units-datasource.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("EnergeticsVpalacUnits");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);

        for (let i = 0, imax = data.length; i < imax; i++) {
            await expect(validator.Validate(data[i])).to.be.fulfilled;
            expect(data[i]).to.have.property("jed_id");
            expect(data[i]).to.have.property("jed_nazev");
            expect(data[i]).to.have.property("jed_zkr");
            expect(data[i]).to.have.property("lt_key");
            expect(data[i]).to.have.property("pot_defcolor");
            expect(data[i]).to.have.property("pot_id");
            expect(data[i]).to.have.property("pot_type");
            expect(data[i]).to.have.property("ptv_id");
        }
    });

});
