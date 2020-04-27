"use strict";

import { BicycleCounters } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { ApiLogsFailuresTransformation } from "../../../src/modules/bicyclecounters";

chai.use(chaiAsPromised);

describe("ApiLogsHitsTransformation", () => {

    let transformation;
    let validator;
    const /* tslint:disable max-line-length */
    testApiLogsFailuresData = [
        {
          created_at: "2020-03-30T09:37:15.092323Z",
          error_code: 200,
          id: 2058,
          issue: "HTTP Error Get \"https://unicam.camea.cz/api/bike-counter/get-all-sensors\": dial tcp 46.13.4.221:443: i/o timeout (Client.Timeout exceeded while awaiting headers)",
          method_id: 0,
          ping: 6703,
        },
        {
          created_at: "2020-03-31T22:46:15.100396Z",
          error_code: 200,
          id: 2059,
          issue: "HTTP Error Get \"https://unicam.camea.cz/api/bike-counter/get-all-sensors\": context deadline exceeded (Client.Timeout exceeded while awaiting headers)",
          method_id: 0,
          ping: 14819,
        },
    ];

    const testApiLogsFailuresTransformedData = [
      {
        error_code: 200,
        id: 2058,
        issue: "HTTP Error Get \"https://unicam.camea.cz/api/bike-counter/get-all-sensors\": dial tcp 46.13.4.221:443: i/o timeout (Client.Timeout exceeded while awaiting headers)",
        measured_at: "2020-03-30T09:37:15.092323Z",
        ping: 6703,
      },
      {
        error_code: 200,
        id: 2059,
        issue: "HTTP Error Get \"https://unicam.camea.cz/api/bike-counter/get-all-sensors\": context deadline exceeded (Client.Timeout exceeded while awaiting headers)",
        measured_at: "2020-03-31T22:46:15.100396Z",
        ping: 14819,
      },
  ];

  /* tslint:enable */

    before(() => {
        validator = new Validator(
          BicycleCounters.apiLogsFailures.name + "ModelValidator",
          BicycleCounters.apiLogsFailures.outputMongooseSchemaObject,
      );
    });

    beforeEach(async () => {
        transformation = new ApiLogsFailuresTransformation();
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("BicyclecountersApiLogsFailures");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform element", async () => {
        const data = await transformation.transform(testApiLogsFailuresData[0]);
        expect(data).to.deep.equal(testApiLogsFailuresTransformedData[0]);
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testApiLogsFailuresData);

        expect(data).to.deep.equal(testApiLogsFailuresTransformedData);

        await expect(validator.Validate(data)).to.be.fulfilled;
    });

});
