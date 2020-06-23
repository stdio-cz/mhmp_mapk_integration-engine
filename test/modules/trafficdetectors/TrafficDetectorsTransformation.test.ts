"use strict";

import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { TrafficDetectorsTransformation } from "../../../src/modules/trafficdetectors";

import * as fs from "fs";

chai.use(chaiAsPromised);

describe("TrafficDetectorsTransformation", () => {

    let transformation;
    let trafficdetectors;
    let trafficdetectorsTransformed;

    beforeEach(async () => {
        transformation = new TrafficDetectorsTransformation();
        trafficdetectors = JSON.parse(fs.readFileSync(
            __dirname + "/../../data/trafficdetectors-raw.json",
            "utf8",
        ));
        trafficdetectorsTransformed = JSON.parse(fs.readFileSync(
            __dirname + "/../../data/trafficdetectors-transformed.json",
            "utf8",
        ));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("TSKSTD");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should transform data correctly", async () => {
        const data = await transformation.transform(trafficdetectors);
        expect(data).to.be.deep.equal(trafficdetectorsTransformed);
    });
});
