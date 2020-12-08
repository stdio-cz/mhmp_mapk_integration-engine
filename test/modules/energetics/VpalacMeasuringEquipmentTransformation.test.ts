"use strict";

import { Energetics } from "@golemio/schema-definitions";
import { JSONSchemaValidator } from "@golemio/validator";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { VpalacMeasuringEquipmentTransformation } from "../../../src/modules/energetics";

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

describe("VpalacMeasuringEquipmentTransformation", () => {

    let transformation;
    let testSourceData;
    let validator;

    before(() => {
        validator = new JSONSchemaValidator(Energetics.vpalac.measuringEquipment.name + "ModelPostgresValidator",
            Energetics.vpalac.measuringEquipment.outputJsonSchema);
    });

    beforeEach(async () => {
        transformation = new VpalacMeasuringEquipmentTransformation();
        const buffer = await readFile(__dirname + "/../../data/energetics-vpalac-measuringequipment-datasource.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("EnergeticsVpalacMeasuringEquipment");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);
        await expect(validator.Validate(data)).to.be.fulfilled;

        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[i]).to.have.property("me_do");
            expect(data[i]).to.have.property("me_extid");
            expect(data[i]).to.have.property("me_fakt");
            expect(data[i]).to.have.property("me_id");
            expect(data[i]).to.have.property("me_od");
            expect(data[i]).to.have.property("me_plom");
            expect(data[i]).to.have.property("me_serial");
            expect(data[i]).to.have.property("me_zapoc");
            expect(data[i]).to.have.property("met_id");
            expect(data[i]).to.have.property("mis_id");
            expect(data[i]).to.have.property("mis_nazev");
            expect(data[i]).to.have.property("poc_typode");
            expect(data[i]).to.have.property("pot_id");
            expect(data[i]).to.have.property("umisteni");
            expect(data[i]).to.have.property("var_id");
        }
    });

});
