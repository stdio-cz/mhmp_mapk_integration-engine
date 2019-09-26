"use strict";

import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { ZtpParkingsInputTransformation } from "../../../src/modules/ztpparkings";

chai.use(chaiAsPromised);
import fs from "fs";

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

describe("ZtpParkingsInputTransformation", () => {

    let transformation;
    let testSourceData;

    beforeEach(async () => {
        transformation = new ZtpParkingsInputTransformation();
        const buffer = await readFile(__dirname + "/../../data/ztpparkings-input.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("ZtpParkingsInput");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);
        expect(data).to.have.property("properties");
        expect(data.properties).to.have.property("device_id");
        expect(data.properties).to.have.property("failure");
        expect(data.properties).to.have.property("id");
        expect(data.properties).to.have.property("last_updated_at");
        expect(data.properties).to.have.property("occupied");
    });

});
