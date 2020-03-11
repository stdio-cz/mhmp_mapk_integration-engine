"use strict";

import { MobileAppStatistics } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { AppStoreTransformation } from "../../../src/modules/mobileappstatistics";

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

describe("AppStoreTransformation", () => {

    let transformation;
    let testSourceData;
    let validator;

    before(() => {
        validator = new Validator(MobileAppStatistics.appStore.name + "ModelValidator",
            MobileAppStatistics.appStore.outputMongooseSchemaObject);
    });

    beforeEach(async () => {
        transformation = new AppStoreTransformation();
        const buffer = await readFile(__dirname + "/../../data/mobileappstatistics_appstore-datasource.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("MobileAppStatisticsAppStore");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.transform(testSourceData[3]);
        await expect(validator.Validate(data)).to.be.fulfilled;

        expect(data).to.have.property("app_id");
        expect(data).to.have.property("app_name");
        expect(data).to.have.property("begin_day");
        expect(data).to.have.property("country");
        expect(data).to.have.property("device");
        expect(data).to.have.property("event_count");
        expect(data).to.have.property("event_type");
        expect(data).to.have.property("version");
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);
        await expect(validator.Validate(data)).to.be.fulfilled;

        for (let i = 0, imax = data.length; i < imax; i++) {
            expect(data[i]).to.have.property("app_id");
            expect(data[i]).to.have.property("app_name");
            expect(data[i]).to.have.property("begin_day");
            expect(data[i]).to.have.property("country");
            expect(data[i]).to.have.property("device");
            expect(data[i]).to.have.property("event_count");
            expect(data[i]).to.have.property("event_type");
            expect(data[i]).to.have.property("version");
        }
    });

});
