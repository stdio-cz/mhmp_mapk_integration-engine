"use strict";

import { MerakiAccessPoints } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { MerakiAccessPointsTransformation } from "../../../src/modules/merakiaccesspoints";

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

describe("MerakiAccessPointsTransformation", () => {

    let transformation;
    let testSourceData;
    let validator;

    before(() => {
        validator = new Validator(MerakiAccessPoints.observations.name + "ModelValidator",
            MerakiAccessPoints.observations.outputMongooseSchemaObject);
    });

    beforeEach(async () => {
        transformation = new MerakiAccessPointsTransformation();
        const buffer = await readFile(__dirname + "/../../data/merakiaccesspoints-input.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("MerakiAccessPoints");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);
        await expect(validator.Validate(data)).to.be.fulfilled;
        expect(data).to.have.property("observations");
        expect(data).to.have.property("tags");
    });
});
