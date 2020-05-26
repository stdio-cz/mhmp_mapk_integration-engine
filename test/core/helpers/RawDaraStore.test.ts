import { config } from "../../../src/core/config";


import * as RawDaraStore from "../../../src/core/helpers/RawDaraStore";

import * as sinon from "sinon";

import { expect } from "chai";
import { Readable } from "stream";

import { S3 } from "aws-sdk";
import { prototype } from "events";

describe("RawDaraStore", () => {

  let sandbox: any;
  let upload: any;

  beforeEach(() => {
      sandbox = sinon.createSandbox();

      upload = sandbox.stub(S3.prototype, "upload").callsFake(() => {
        return new Readable({
          objectMode: false,
          read: () => {
              return;
          },
        });
      });

      config.s3.enabled = true;
      config.saveRawDataWhitelist = {
          test: [],
      };
  });

  afterEach(() => {
      sandbox.restore();
  });

  it("should has RawDaraStore method", async () => {
      expect(RawDaraStore.save).not.to.be.undefined;
  });

  it("should call upload on S3 sdk", async () => {
      RawDaraStore.save({}, "test");
      sandbox.assert.calledOnce(upload);
  });



});
