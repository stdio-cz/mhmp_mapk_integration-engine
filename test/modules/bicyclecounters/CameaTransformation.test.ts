"use strict";

import { BicycleCounters } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { CameaTransformation } from "../../../src/modules/bicyclecounters";

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

describe("CameaTransformation", () => {

    let transformation;
    let testSourceData;
    let locationsValidator;
    let directionsValidator;

    before(() => {
        locationsValidator = new Validator(BicycleCounters.camea.name + "LocModelValidator",
            BicycleCounters.locations.outputMongooseSchemaObject);
        directionsValidator = new Validator(BicycleCounters.camea.name + "DirModelValidator",
            BicycleCounters.directions.outputMongooseSchemaObject);
    });

    beforeEach(async () => {
        transformation = new CameaTransformation();
        const buffer = await readFile(__dirname + "/../../data/bicyclecounters-camea-datasource.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("CameaBicycleCounters");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.transform(testSourceData[0]);
        expect(data).to.have.property("directions");
        expect(data).to.have.property("locations");
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);

        await expect(locationsValidator.Validate(data.locations)).to.be.fulfilled;
        await expect(directionsValidator.Validate(data.directions)).to.be.fulfilled;

        expect(data).to.have.property("directions");
        expect(data).to.have.property("locations");
    });

});
