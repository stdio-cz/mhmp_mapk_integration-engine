"use strict";

import { Energetics } from "@golemio/schema-definitions";
import { JSONSchemaValidator } from "@golemio/validator";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { VpalacTypeMeasuringEquipmentTransformation } from "../../../src/modules/energetics";

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

describe("VpalacTypeMeasuringEquipmentTransformation", () => {

    let transformation;
    let testSourceData;
    let validator;

    before(() => {
        validator = new JSONSchemaValidator(Energetics.vpalac.typeMeasuringEquipment.name + "ModelPostgresValidator",
            Energetics.vpalac.typeMeasuringEquipment.outputJsonSchema);
    });

    beforeEach(async () => {
        transformation = new VpalacTypeMeasuringEquipmentTransformation();
        const buffer = await readFile(__dirname + "/../../data/energetics-vpalac-typemeasuringequipment-datasource.json");
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
        await expect(validator.Validate(data)).to.be.fulfilled;

        for (let i = 0, imax = data.length; i < imax; i++) {
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
