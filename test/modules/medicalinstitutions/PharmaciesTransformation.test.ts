"use strict";

import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { PharmaciesTransformation } from "../../../src/modules/medicalinstitutions";

chai.use(chaiAsPromised);
const fs = require("fs");

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

describe("PharmaciesTransformation", () => {

    let transformation;
    let testSourceData;

    beforeEach(async () => {
        transformation = new PharmaciesTransformation();
        const buffer = await readFile(__dirname + "/../../data/medicalinstitutions_pharmacies-data.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("Pharmacies");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform collection", async () => {
        testSourceData[0].data = await readFile(__dirname + "/../../data/medicalinstitutions/lekarny_prac_doba.csv");
        testSourceData[1].data = await readFile(__dirname + "/../../data/medicalinstitutions/lekarny_seznam.csv");
        testSourceData[2].data = await readFile(__dirname + "/../../data/medicalinstitutions/lekarny_typ.csv");
        const data = await transformation.transform(testSourceData);
        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[i]).to.have.property("geometry");
            expect(data[i]).to.have.property("properties");
            expect(data[i]).to.have.property("type");
            expect(data[i].properties).to.have.property("address");
            expect(data[i].properties.address).to.have.property("address_country");
            expect(data[i].properties.address).to.have.property("address_locality");
            expect(data[i].properties.address).to.have.property("address_formatted");
            expect(data[i].properties.address).to.have.property("street_address");
            expect(data[i].properties.address).to.have.property("postal_code");
            expect(data[i].properties).to.have.property("id");
            expect(data[i].properties).to.have.property("institution_code");
            expect(data[i].properties).to.have.property("name");
            expect(data[i].properties).to.have.property("type");
            expect(data[i].properties.type).to.have.property("description");
            expect(data[i].properties.type).to.have.property("id");
            expect(data[i].properties).to.have.property("updated_at");
        }
    });

});
