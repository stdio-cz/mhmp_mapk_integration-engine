"use strict";

import { Parkings } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { KoridParkingDataTransformation } from "../../../src/modules/parkings";

chai.use(chaiAsPromised);
import { promises as fs } from "fs";

describe("KoridParkingDataTransformation", () => {

    let transformation;
    let testSourceData;
    let validator;

    before(() => {
        validator = new Validator(Parkings.name + "PgModelValidator",
            Parkings.pg.outputMongooseSchemaObject);
    });

    beforeEach(async () => {
        transformation = new KoridParkingDataTransformation();
        const buffer = await fs.readFile(__dirname + "/../../data/korid-parkings-data-input.json");
        testSourceData = JSON.parse(buffer.toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("KoridParkingsData");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);
        await expect(validator.Validate(data)).to.be.fulfilled;
    });

});
