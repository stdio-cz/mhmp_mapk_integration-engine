/// <reference path="../../../node_modules/@types/node/index.d.ts" />

"use strict";

import "mocha";
import { GeneralTransformation } from "../../../src/modules/general";

const chai = require("chai");
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

describe("GeneralTransformation", () => {

    let transformation;

    beforeEach(async () => {
        transformation = new GeneralTransformation();
    });

    it("should has name", async () => {
        expect(transformation.name).not.to.be.undefined;
        expect(transformation.name).is.equal("General");
    });

    it("should has transform method", async () => {
        expect(transformation.transform).not.to.be.undefined;
    });

    it("should properly transform object element", async () => {
        const testJsonData = {
            foo: "text",
            foo2: 1,
        };
        const data = await transformation.transform({
            body: testJsonData,
            headers: {
                "content-type": "application/json",
            },
        });
        expect(data).to.have.property("data");
        expect(data).to.have.property("headers");
        expect(data.data).is.equal(testJsonData);
        expect(data.headers).to.have.property("content-type");
    });

    it("should properly transform plain text element", async () => {
        const data = await transformation.transform({
            body: "text",
            headers: {
                "content-type": "text/plain",
            },
        });
        expect(data).to.have.property("data");
        expect(data).to.have.property("headers");
        expect(data.data).to.have.property("textData");
        expect(data.headers).to.have.property("content-type");
    });
});
