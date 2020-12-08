"use strict";

import { Energetics } from "@golemio/schema-definitions";
import { JSONSchemaValidator } from "@golemio/validator";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { VpalacMeterTypeTransformation } from "../../../src/modules/energetics";

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

describe("VpalacMeterTypeTransformation", () => {

    let transformation;
    let testSourceData;
    let validator;

    before(() => {
        validator = new JSONSchemaValidator(Energetics.vpalac.meterType.name + "ModelPostgresValidator",
            Energetics.vpalac.meterType.outputJsonSchema);
    });

    beforeEach(async () => {
        transformation = new VpalacMeterTypeTransformation();
        const buffer = await readFile(__dirname + "/../../data/energetics-vpalac-metertype-datasource.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("EnergeticsVpalacMeterType");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.transform(testSourceData[0]);
        await expect(validator.Validate(data)).to.be.fulfilled;

        expect(data).to.have.property("fir_id");
        expect(data).to.have.property("medium");
        expect(data).to.have.property("met_druh");
        expect(data).to.have.property("met_id");
        expect(data).to.have.property("met_kod");
        expect(data).to.have.property("met_nazev");
        expect(data).to.have.property("met_ziv");
        expect(data).to.have.property("vyr_zkr");
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);
        await expect(validator.Validate(data)).to.be.fulfilled;

        for (let i = 0, imax = data.length; i < imax; i++) {
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
