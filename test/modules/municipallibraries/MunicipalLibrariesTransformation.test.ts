"use strict";

import { MunicipalLibraries } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { MunicipalLibrariesTransformation } from "../../../src/modules/municipallibraries";

chai.use(chaiAsPromised);
import { promises as fs } from "fs";

describe("MunicipalLibrariesTransformation", () => {

    let transformation;
    let testSourceData;
    let validator;

    before(() => {
        validator = new Validator(MunicipalLibraries.name + "ModelValidator",
            MunicipalLibraries.outputMongooseSchemaObject);
    });

    beforeEach(async () => {
        transformation = new MunicipalLibrariesTransformation();
        const buffer = await fs.readFile(__dirname + "/../../data/municipallibraries-datasource.json");
        testSourceData = JSON.parse(buffer.toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("MunicipalLibraries");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.transform(testSourceData[3]);
        await expect(validator.Validate(data)).to.be.fulfilled;

        expect(data).to.have.property("geometry");
        expect(data).to.have.property("properties");
        expect(data).to.have.property("type");
        expect(data.properties).to.have.property("id");
        expect(data.properties).to.have.property("name");
        expect(data.properties).to.have.property("updated_at");
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);
        await expect(validator.Validate(data)).to.be.fulfilled;

        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[i]).to.have.property("geometry");
            expect(data[i]).to.have.property("properties");
            expect(data[i]).to.have.property("type");
            expect(data[i].properties).to.have.property("id");
            expect(data[i].properties).to.have.property("name");
            expect(data[i].properties).to.have.property("updated_at");
        }
    });

});
