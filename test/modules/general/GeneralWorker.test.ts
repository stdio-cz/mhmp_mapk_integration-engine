"use strict";

import { GeneralImport } from "@golemio/schema-definitions";
import * as chai from "chai";
import { expect } from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import * as sinon from "sinon";
import { config } from "../../../src/core/config";
import { MongoModel } from "../../../src/core/models";
import { GeneralWorker } from "../../../src/modules/general";

chai.use(chaiAsPromised);

describe("GeneralWorker", () => {

    let worker;
    let sandbox;
    let testJsonData;
    let testTransformedJsonData;
    let providerName;
    let model: MongoModel;

    beforeEach(() => {
        sandbox = sinon.createSandbox({ useFakeTimers: true });

        providerName = "generalimport";
        model = new MongoModel(providerName + "Model", {
            identifierPath: "id",
            mongoCollectionName: providerName,
            outputMongooseSchemaObject: {},
            savingType: "insertOnly",
        }, null);
        testJsonData = {
            body: {
                foo: "text",
            },
            headers: {
                "content-type": "application/json",
            },
            providerName,
        };
        testTransformedJsonData = {
            data: testJsonData.body,
            headers: testJsonData.headers,
        };

        worker = new GeneralWorker();

        sandbox.stub(model, "save");
        sandbox.stub(worker, "createModel").withArgs(providerName)
            .callsFake(() => {
                return model;
            });
        sandbox.stub(worker.transformation, "transform")
            .callsFake(() => testTransformedJsonData);
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should create MongoModel by createModel method", async () => {
        const m = worker.createModel(providerName);
        expect(m).not.to.be.undefined;
        expect(m).to.be.an.instanceof(MongoModel);
        expect(m.name).is.equal(providerName + "Model");
        expect(m.mongooseModel.collection.name).is.equal(providerName);
    });

    it("should call the correct methods by saveData method", async () => {
        await worker.saveData({
            content: new Buffer(JSON.stringify(testJsonData)),
        });
        sandbox.assert.calledOnce(worker.createModel);
        sandbox.assert.calledWith(worker.createModel, providerName);
        sandbox.assert.calledOnce(worker.transformation.transform);
        sandbox.assert.calledWith(worker.transformation.transform, testJsonData);
        // sandbox.assert.calledOnce(model.save);
        // sandbox.assert.calledWith(model.save, testTransformedJsonData);

        sandbox.assert.callOrder(
            worker.createModel,
            worker.transformation.transform,
            // model.save,
        );
    });
});
