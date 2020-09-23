"use strict";

import { CustomError } from "@golemio/errors";
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import "mocha";
import * as sinon from "sinon";

import { IDataTypeStrategy, IProtocolStrategy } from "../../../src/core/datasources";

import { DataSourceStreamed } from "../../../src/core/datasources";
import { DataSourceStream } from "../../../src/core/datasources/DataSourceStream";
import { log } from "../../../src/core/helpers/Logger";

import { waitTillStreamEnds } from "../../helpers";

chai.use(chaiAsPromised);

describe("DataSourceStreamed", () => {

    let sandbox;
    let getDatasource;
    let getStream;
    let genericDatasource;
    let protocolStub;
    let dataTypeStub;
    let validatorStub;

    beforeEach(() => {
        getStream = (data) => {
            const dataStream =  new DataSourceStream({
                objectMode: true,
                read: () => {
                    return;
                },
            });
            dataStream.push(data);
            return dataStream;
          };

        sandbox = sinon.createSandbox();

        protocolStub = {
            getData: sandbox.stub().callsFake(async () => {
                const dataStream = getStream(
                    {
                        message: "test",
                    });
                return dataStream;
            }),
            getLastModified: sandbox.stub(),
            setCallerName: sandbox.stub(),
        };
        dataTypeStub = {
            parseData: sandbox.stub().callsFake(() => Object.assign({message: "test"})),
        };
        validatorStub = {
            Validate: sandbox.stub().callsFake(() => true),
        };

        getDatasource = (protocol, dataType, validator) => {
            return new DataSourceStreamed(
                "TestDataSource",
                protocol as IProtocolStrategy,
                dataType as IDataTypeStrategy,
                validator,
                );
        };

        genericDatasource = getDatasource(protocolStub, dataTypeStub, validatorStub);
        sandbox.spy(log, "warn");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should call protocol.setCallerName in constructor", () => {
        sandbox.assert.calledOnce(protocolStub.setCallerName);
    });

    it("should has name method", () => {
        chai.expect(genericDatasource.name).not.to.be.undefined;
    });

    it("should has getAll method", () => {
        chai.expect(genericDatasource.getAll).not.to.be.undefined;
    });

    it("should has getLastModified method", () => {
        chai.expect(genericDatasource.getLastModified).not.to.be.undefined;
    });

    it("should has setProtocolStrategy method", () => {
        chai.expect(genericDatasource.setProtocolStrategy).not.to.be.undefined;
    });

    it("should has setDataTypeStrategy method", () => {
        chai.expect(genericDatasource.setDataTypeStrategy).not.to.be.undefined;
    });

    it("should has setValidator method", () => {
        chai.expect(genericDatasource.setValidator).not.to.be.undefined;
    });

    it("should has proceed method", () => {
        chai.expect(genericDatasource.setValidator).not.to.be.undefined;
    });

    it("should properly get all data", async () => {
        const datasource = getDatasource(protocolStub, dataTypeStub, validatorStub);
        const dataStream = await datasource.getAll();
        let outputData: any;

        dataStream.onDataListeners.push((data) => {
            outputData = data;
            dataStream.push(null);
        });

        datasource.proceed();

        await waitTillStreamEnds(dataStream);

        chai.expect(outputData).to.deep.equal({
            message: "test",
        });
    });

    it("should throws error if data are not valid", async () => {
        validatorStub.Validate =  sandbox.stub().callsFake(() => {
            throw new Error("oh noooooooooooooo")
        });

        const datasource = getDatasource(protocolStub, dataTypeStub, validatorStub);

        datasource.setValidator(validatorStub);

        const dataStream = await datasource.getAll();
        let error = null;

        dataStream.on("error", (err) => {
            error = err;
        });

        dataStream.onDataListeners.push(() => {
            dataStream.push(null);
        });

        await datasource.proceed();

        await waitTillStreamEnds(dataStream);
        chai.expect(error).to.be.an("error")
        chai.expect(error.cause.message).to.be.equal("oh noooooooooooooo");
    });

    it("should throws error on error event on datastream", async () => {
        validatorStub.Validate =  sandbox.stub().callsFake(() => {
            return true;
        });

        const datasource = getDatasource(protocolStub, dataTypeStub, validatorStub);

        datasource.setValidator(validatorStub);

        const dataStream = await datasource.getAll();
        let error = null;

        dataStream.on("error", (err) => {
            error = err;
        });

        dataStream.emit(
            "error",
            new CustomError("horrible error", true, "name", 2004, new Error("horrible error")),
        );

        dataStream.onDataListeners.push(() => {
            dataStream.push(null);
        });

        await datasource.proceed();

        await waitTillStreamEnds(dataStream);
        chai.expect(error.cause.message).to.be.equal("horrible error");
    });

    it("should warn if data are empty array", async () => {
        protocolStub = {
            getData: sandbox.stub().callsFake(async () => {
                return getStream(
                    {
                        message: "test",
                    });
            }),
            getLastModified: sandbox.stub(),
            setCallerName: sandbox.stub(),
        };

        const datasource = getDatasource(protocolStub, dataTypeStub, validatorStub);

        const dataStream = await datasource.getAll();
        // need to init handlers
        dataStream.push("somedata");
        dataTypeStub.parseData = sandbox.stub().callsFake(() => []);
        datasource.setDataTypeStrategy(dataTypeStub);
        dataStream.push("somedata");

        dataStream.push(null);

        await datasource.proceed();
        await waitTillStreamEnds(dataStream);
        sandbox.assert.calledOnce(log.warn);
    });

    it("should warn if data are null", async () => {
        protocolStub = {
            getData: sandbox.stub().callsFake(async () => {
                return getStream(
                    {
                        message: "test",
                    });
            }),
            getLastModified: sandbox.stub(),
            setCallerName: sandbox.stub(),
        };

        const datasource = getDatasource(protocolStub, dataTypeStub, validatorStub);

        const dataStream = await datasource.getAll();

        dataStream.push("somedata");
        dataTypeStub.parseData = sandbox.stub().callsFake(() => null);
        datasource.setDataTypeStrategy(dataTypeStub);
        dataStream.push("somedata");

        dataStream.push(null);

        await datasource.proceed();

        await waitTillStreamEnds(dataStream);
        sandbox.assert.calledOnce(log.warn);
    });

    it("should warn if data are empty object", async () => {
        protocolStub = {
            getData: sandbox.stub().callsFake(async () => {
                return getStream(
                    {
                        message: "test",
                    });
            }),
            getLastModified: sandbox.stub(),
            setCallerName: sandbox.stub(),
        };

        const datasource = getDatasource(protocolStub, dataTypeStub, validatorStub);

        const dataStream = await datasource.getAll();

        dataStream.push("somedata");
        dataTypeStub.parseData = sandbox.stub().callsFake(() => Object.assign({}));
        datasource.setDataTypeStrategy(dataTypeStub);
        dataStream.push("somedata");

        dataStream.push(null);

        await datasource.proceed();

        await waitTillStreamEnds(dataStream);
        sandbox.assert.calledOnce(log.warn);
    });

    it("should properly get last modified", async () => {
        const datasource = getDatasource(protocolStub, dataTypeStub, validatorStub);

        await datasource.getLastModified();
        sandbox.assert.calledOnce(protocolStub.getLastModified);
    });

    it("should set protocol strategy", async () => {
        const datasource = getDatasource(protocolStub, dataTypeStub, validatorStub);

        datasource.setProtocolStrategy(protocolStub);
        sandbox.assert.calledThrice(protocolStub.setCallerName);
        datasource.setProtocolStrategy({});
        chai.expect(datasource.protocolStrategy).to.be.deep.equal({});
    });

    it("should set datatype strategy", async () => {
        const datasource = getDatasource(protocolStub, dataTypeStub, validatorStub);

        datasource.setDataTypeStrategy(null);
        chai.expect(datasource.dataTypeStrategy).to.be.null;
    });

    it("should set validator", async () => {
        const datasource = getDatasource(protocolStub, dataTypeStub, validatorStub);

        datasource.setValidator(null);
        chai.expect(datasource.validator).to.be.null;
    });

});
