import { config } from "../../../src/core/config";


import * as RawDaraStore from "../../../src/core/helpers/RawDaraStore";

import * as sinon from "sinon";

import { expect } from "chai";
import { Readable } from "stream";

import { S3 } from "aws-sdk";
import { prototype } from "events";

describe("RawDaraStore", () => {

  const data = {
    key: "val",
  };
  const meta = {
    headers: {
      "content-type": "text/x-json;charset=UTF-8",
    },
    statusCode: 200,
  };

  let sandbox: any;
  let upload: any;
  let clock: any;


  beforeEach(() => {
      sandbox = sinon.createSandbox();
      clock = sandbox.useFakeTimers(new Date("2019-10-01T00:00:00.000+02:00").getTime());

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
          test: {
            saveHeaders: true,
          },
      };
  });

  afterEach(() => {
      sandbox.restore();
      clock.restore();
  });

  it("should has RawDaraStore method", async () => {
      expect(RawDaraStore.save).not.to.be.undefined;
  });

  it("should call upload on S3 sdk with correct arguments", async () => {
      RawDaraStore.save(data, meta, "test");

      sandbox.assert.calledOnce(upload);
      sandbox.assert.calledWith(upload, {
        Body: {
          key: "val",
        },
        Bucket: config.s3.bucket_name,
        Key: "test/2019-10-01/00_00_00.000.json",
        },
        {
          partSize: config.s3.upload_part_size * 1024 * 1024,
          queueSize: config.s3.upload_queue_size,
        },
      );
  });

  it("should call upload on S3 sdk to upload body and headers if non 200 status code is provided", async () => {
    RawDaraStore.save("{}", {
      headers: {},
      statusCode: 400,
    }, "test");

    sandbox.assert.calledTwice(upload);
    sandbox.assert.calledWith(upload, {
      Body: "{}",
      Bucket: config.s3.bucket_name,
      Key: "test/2019-10-01/00_00_00.000",
      },
      {
        partSize: config.s3.upload_part_size * 1024 * 1024,
        queueSize: config.s3.upload_queue_size,
      },
    );
    sandbox.assert.calledWith(upload, {
      Body: "{}",
      Bucket: config.s3.bucket_name,
      Key: "test/2019-10-01/00_00_00.000_headers.json",
      },
      {
        partSize: config.s3.upload_part_size * 1024 * 1024,
        queueSize: config.s3.upload_queue_size,
      },
    );
  });
});
