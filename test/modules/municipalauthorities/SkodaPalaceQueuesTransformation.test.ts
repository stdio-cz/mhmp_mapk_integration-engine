"use strict";

import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { SkodaPalaceQueuesTransformation } from "../../../src/modules/municipalauthorities";

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

describe("SkodaPalaceQueuesTransformation", () => {

    let transformation;
    let testSourceData;

    beforeEach(async () => {
        transformation = new SkodaPalaceQueuesTransformation();
        const buffer = await readFile(__dirname + "/../../data/skodapalacequeues-datasource.json");
        testSourceData = JSON.parse(Buffer.from(buffer).toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("SkodaPalaceQueues");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform", async () => {
        const data = await transformation.transform(testSourceData);
        expect(data).to.have.property("last_updated");
        expect(data).to.have.property("municipal_authority_id");
        expect(data).to.have.property("served_activities");
        expect(data).to.have.property("title");
        expect(data).to.have.property("updated_at");
    });

    describe("history", () => {

        let testTransformedData;

        beforeEach(async () => {
            transformation = new SkodaPalaceQueuesTransformation();
            const buffer = await readFile(__dirname + "/../../data/municipalauthorities_queues-transformed.json");
            testTransformedData = JSON.parse(Buffer.from(buffer).toString("utf8"));
        });

        it("should has transformHistory method", async () => {
            expect(transformation.transformHistory).not.to.be.undefined;
        });

        it("should properly transform history", async () => {
            const data = await transformation.transformHistory(testTransformedData);
            for (let i = 0, imax = data.length; i < imax; i++) {
                expect(data[0]).to.have.property("last_updated");
                expect(data[0]).to.have.property("municipal_authority_id");
                expect(data[0]).to.have.property("activity");
                expect(data[0]).to.have.property("number_of_person_in_queue");
                expect(data[0]).to.have.property("number_of_serving_counters");
                expect(data[0]).to.have.property("updated_at");
            }
        });

    });

});
