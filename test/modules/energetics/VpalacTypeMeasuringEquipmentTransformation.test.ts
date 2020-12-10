"use strict";

import { Energetics } from "@golemio/schema-definitions";
import * as fs from "fs";
import { JSONSchemaValidator } from "@golemio/validator";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { VpalacTypeMeasuringEquipmentTransformation } from "../../../src/modules/energetics";

chai.use(chaiAsPromised);

describe("VpalacTypeMeasuringEquipmentTransformation", () => {

    let transformation;
    let testSourceData;
    let validator;

    before(() => {
        validator = new JSONSchemaValidator(Energetics.vpalac.typeMeasuringEquipment.name + "ModelPostgresValidator",
            Energetics.vpalac.typeMeasuringEquipment.outputJsonSchema);
    });

    beforeEach(() => {
        transformation = new VpalacTypeMeasuringEquipmentTransformation();
        const buffer = fs.readFileSync(__dirname + "/../../data/energetics-vpalac-typemeasuringequipment-datasource.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("EnergeticsVpalacTypeMeasuringEquipment");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);

        for (let i = 0, imax = data.length; i < imax; i++) {
            await expect(validator.Validate(data[i])).to.be.fulfilled;
            expect(data[i]).to.have.property("cik_akt");
            expect(data[i]).to.have.property("cik_char");
            expect(data[i]).to.have.property("cik_cislo");
            expect(data[i]).to.have.property("cik_cislo2");
            expect(data[i]).to.have.property("cik_double");
            expect(data[i]).to.have.property("cik_fk");
            expect(data[i]).to.have.property("cik_nazev");
            expect(data[i]).to.have.property("cik_pzn");
            expect(data[i]).to.have.property("cik_zprac");
            expect(data[i]).to.have.property("lt_key");
        }
    });

});
