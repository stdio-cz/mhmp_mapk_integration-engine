"use strict";

import { Energetics } from "@golemio/schema-definitions";
import { JSONSchemaValidator } from "@golemio/validator";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { VpalacUnitsTransformation } from "../../../src/modules/energetics";

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

describe("VpalacUnitsTransformation", () => {

    let transformation;
    let testSourceData;
    let validator;

    before(() => {
        validator = new JSONSchemaValidator(Energetics.vpalac.units.name + "ModelPostgresValidator",
            Energetics.vpalac.units.outputJsonSchema);
    });

    beforeEach(async () => {
        transformation = new VpalacUnitsTransformation();
        const buffer = await readFile(__dirname + "/../../data/energetics-vpalac-units-datasource.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("EnergeticsVpalacUnits");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.transform(testSourceData[0]);
        await expect(validator.Validate(data)).to.be.fulfilled;

        expect(data).to.have.property("jed_id");
        expect(data).to.have.property("jed_nazev");
        expect(data).to.have.property("jed_zkr");
        expect(data).to.have.property("lt_key");
        expect(data).to.have.property("pot_defcolor");
        expect(data).to.have.property("pot_id");
        expect(data).to.have.property("pot_type");
        expect(data).to.have.property("ptv_id");
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);
        await expect(validator.Validate(data)).to.be.fulfilled;

        for (let i = 0, imax = data.length; i < imax; i++) {
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
