"use strict";

import { BicycleCounters } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { ApiLogsHitsTransformation } from "../../../src/modules/bicyclecounters";

chai.use(chaiAsPromised);

describe("ApiLogsHitsTransformation", () => {

    let transformation;
    let validator;
    const testApiLogsHitsData = [
      {
        created_at: "2020-04-01T12:10:00.448511Z",
        id: 17657,
        latency: 351808,
        ping_time: 11067,
      },
      {
        created_at: "2020-04-01T12:11:00.417693Z",
        id: 17658,
        latency: 328694,
        ping_time: 3737,
      },
    ];

    const testApiLogsHitsTransformedData = [
      {
        id: 17657,
        latency: 351808,
        measured_at: "2020-04-01T12:10:00.448511Z",
        ping_time: 11067,
      },
      {
        id: 17658,
        latency: 328694,
        measured_at: "2020-04-01T12:11:00.417693Z",
        ping_time: 3737,
      },
    ];

    before(() => {
        validator = new Validator(
          BicycleCounters.apiLogsHits.name + "ModelValidator",
          BicycleCounters.apiLogsHits.outputMongooseSchemaObject,
      );
    });

    beforeEach(async () => {
        transformation = new ApiLogsHitsTransformation();
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("BicyclecountersApiLogsHits");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.transform(testApiLogsHitsData[0]);
        expect(data).to.deep.equal(testApiLogsHitsTransformedData[0]);
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testApiLogsHitsData);

        expect(data).to.deep.equal(testApiLogsHitsTransformedData);

        await expect(validator.Validate(data)).to.be.fulfilled;
    });

});
