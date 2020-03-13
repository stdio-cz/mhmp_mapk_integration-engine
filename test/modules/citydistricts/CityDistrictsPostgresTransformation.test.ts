"use strict";

import { CityDistricts } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { CityDistrictsPostgresTransformation } from "../../../src/modules/citydistricts";

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

describe("CityDistrictsPostgresTransformation", () => {

    let transformation;
    let testSourceData;
    let validator;

    before(() => {
        validator = new Validator(CityDistricts.name + "ModelPostgresValidator",
            CityDistricts.postgres.outputMongooseSchemaObject);
    });

    beforeEach(async () => {
        transformation = new CityDistrictsPostgresTransformation();
        const buffer = await readFile(__dirname + "/../../data/citydistricts-datasource.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("CityDistricts");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.transform(testSourceData[0]);
        await expect(validator.Validate(data)).to.be.fulfilled;

        expect(data).to.have.property("area");
        expect(data).to.have.property("change_date");
        expect(data).to.have.property("change_status");
        expect(data).to.have.property("create_date");
        expect(data).to.have.property("district_name");
        expect(data).to.have.property("district_short_name");
        expect(data).to.have.property("geom");
        expect(data).to.have.property("id");
        expect(data).to.have.property("id_provider");
        expect(data).to.have.property("kod_mo");
        expect(data).to.have.property("kod_so");
        expect(data).to.have.property("objectid");
        expect(data).to.have.property("provider");
        expect(data).to.have.property("shape_area");
        expect(data).to.have.property("shape_length");
        expect(data).to.have.property("tid_tmmestckecasti_p");
        expect(data).to.have.property("zip");
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);
        await expect(validator.Validate(data)).to.be.fulfilled;

        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[i]).to.have.property("area");
            expect(data[i]).to.have.property("change_date");
            expect(data[i]).to.have.property("change_status");
            expect(data[i]).to.have.property("create_date");
            expect(data[i]).to.have.property("district_name");
            expect(data[i]).to.have.property("district_short_name");
            expect(data[i]).to.have.property("geom");
            expect(data[i]).to.have.property("id");
            expect(data[i]).to.have.property("id_provider");
            expect(data[i]).to.have.property("kod_mo");
            expect(data[i]).to.have.property("kod_so");
            expect(data[i]).to.have.property("objectid");
            expect(data[i]).to.have.property("provider");
            expect(data[i]).to.have.property("shape_area");
            expect(data[i]).to.have.property("shape_length");
            expect(data[i]).to.have.property("tid_tmmestckecasti_p");
            expect(data[i]).to.have.property("zip");
        }
    });

});
