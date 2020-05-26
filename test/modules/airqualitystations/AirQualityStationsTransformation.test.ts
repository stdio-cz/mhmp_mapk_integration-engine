"use strict";

import { AirQualityStations } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import { AirQualityStationsTransformation } from "../../../src/modules/airqualitystations";

chai.use(chaiAsPromised);
import { promises as fs } from "fs";

describe("AirQualityStationsTransformation", () => {

    let transformation;
    let testSourceData;
    let stationsValidator;
    let measurementsValidator;
    let indexesValidator;

    before(() => {
        stationsValidator = new Validator(AirQualityStations.stations.name + "ModelValidator",
            AirQualityStations.stations.outputMongooseSchemaObject);
        measurementsValidator = new Validator(AirQualityStations.measurements.name + "ModelValidator",
            AirQualityStations.measurements.outputMongooseSchemaObject);
        indexesValidator = new Validator(AirQualityStations.indexes.name + "ModelValidator",
            AirQualityStations.indexes.outputMongooseSchemaObject);
    });

    beforeEach(async () => {
        transformation = new AirQualityStationsTransformation();
        const buffer = await fs.readFile(__dirname + "/../../data/airqualitystations_3h-datasource.json");
        testSourceData = JSON.parse(buffer.toString("utf8"));
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("AirQualityStations");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform collection", async () => {
        const data = await transformation.transform(testSourceData);

        await expect(stationsValidator.Validate(data.stations)).to.be.fulfilled;
        await expect(measurementsValidator.Validate(data.measurements)).to.be.fulfilled;
        await expect(indexesValidator.Validate(data.indexes)).to.be.fulfilled;

        expect(data).to.have.property("stations");
        expect(data).to.have.property("measurements");
        expect(data).to.have.property("indexes");
    });

});
