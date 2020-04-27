"use strict";

import { MOS } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { MosBETokensTransformation } from "../../../src/modules/mosbe";

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

describe("MosBETokensTransformation", () => {

    let transformation;
    let testSourceData;
    let validator;

    before(() => {
        validator = new Validator(MOS.BE.tokens.name + "ModelValidator",
            MOS.BE.tokens.outputMongooseSchemaObject);
    });

    beforeEach(async () => {
        transformation = new MosBETokensTransformation();
        const buffer = await readFile(__dirname + "/../../data/mosbe_tokens-input.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("MOSBETokens");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.transform(testSourceData[0]);
        await expect(validator.Validate(data)).to.be.fulfilled;

        expect(data).to.have.property("created");
        expect(data).to.have.property("identifier_type");
        expect(data).to.have.property("token_id");
});

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);
        await expect(validator.Validate(data)).to.be.fulfilled;

        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[0]).to.have.property("created");
            expect(data[0]).to.have.property("identifier_type");
            expect(data[0]).to.have.property("token_id");
        }
    });

});
