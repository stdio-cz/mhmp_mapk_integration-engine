"use strict";

import { Meteosensors } from "@golemio/schema-definitions";
import "mocha";
import * as sinon from "sinon";
import { PostgresConnector } from "../../../src/core/connectors";
import { DataSourceStream } from "../../../src/core/datasources/DataSourceStream";
import { TrafficDetectorsWorker} from "../../../src/modules/trafficdetectors";

import { waitTillStreamEnds } from "../../helpers";

import * as fs from "fs";

describe("MeteosensorsWorker", () => {

    let worker;
    let sandbox;
    let trafficdetectors;
    let trafficdetectorsTransformed;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        sandbox.stub(PostgresConnector, "getConnection")
        .callsFake(() => Object.assign({
            define: () => {
              return {
                removeAttribute: () => {
                  return;
                },
              };
            },
        }));

        trafficdetectors = JSON.parse(fs.readFileSync(
            __dirname + "/../../data/trafficdetectors-raw.json",
            "utf8",
        ));
        trafficdetectorsTransformed = JSON.parse(fs.readFileSync(
            __dirname + "/../../data/trafficdetectors-transformed.json",
            "utf8",
        ));

        worker = new TrafficDetectorsWorker();

        const getOutputStream = async (data, stream) => {
            stream.push(data);
            stream.push(null);
            return stream;
          };

        const dataStream =  new DataSourceStream({
        objectMode: true,
        read: () => {
            return;
        },
        });

        sandbox.stub(worker.dataSource, "getOutputStream")
            .callsFake(() => getOutputStream(trafficdetectors, dataStream));
        sandbox.stub(worker.transformation, "transform")
            .callsFake(() => trafficdetectorsTransformed);

        sandbox.stub(worker.measurementsModel, "saveBySqlFunction");
        sandbox.stub(worker.errorsModel, "saveBySqlFunction");
        sandbox.spy(worker.dataSource, "getAll");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should calls the correct methods by refreshDataInDB method", async () => {
        await worker.saveNewTSKSTDDataInDB();

        await waitTillStreamEnds(worker.dataStream);

        sandbox.assert.calledOnce(worker.dataSource.getAll);
        sandbox.assert.calledOnce(worker.transformation.transform);
        sandbox.assert.calledWith(worker.transformation.transform, trafficdetectors);
        sandbox.assert.calledOnce(worker.measurementsModel.saveBySqlFunction);
        sandbox.assert.calledWith(
          worker.measurementsModel.saveBySqlFunction,
          trafficdetectorsTransformed.data,
          ["detector_id", "measured_from", "measured_to", "measurement_type", "class_id"],
          false,
          null,
          null,
          trafficdetectorsTransformed.token,
        );
        sandbox.assert.calledOnce(worker.errorsModel.saveBySqlFunction);
        sandbox.assert.calledWith(
          worker.errorsModel.saveBySqlFunction,
          trafficdetectorsTransformed.errors,
          ["detector_id", "error_id", "measured_at"],
          false,
          null,
          null,
          trafficdetectorsTransformed.token,
        );

        sandbox.assert.callOrder(
            worker.dataSource.getAll,
            worker.transformation.transform,
            worker.measurementsModel.saveBySqlFunction,
            worker.errorsModel.saveBySqlFunction,
        );
    });
});
