"use strict";

import { WazeCCP } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { WazeCCPJamsTransformation } from "../../../src/modules/wazeccp";

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

describe("WazeCCPJamsTransformation", () => {

    let transformation;
    let testSourceData;
    let validator;

    before(() => {
        validator = new Validator(WazeCCP.jams.name + "ModelValidator",
            WazeCCP.jams.outputMongooseSchemaObject);
    });

    beforeEach(async () => {
        transformation = new WazeCCPJamsTransformation();
        const buffer = await readFile(__dirname + "/../../data/wazeccp_jams-datasource.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("WazeCCPJams");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);
        await expect(validator.Validate(data)).to.be.fulfilled;

        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[i]).to.have.property("id");
            expect(data[i]).to.have.property("pub_millis");
            expect(data[i]).to.have.property("uuid");
        }
    });

});
