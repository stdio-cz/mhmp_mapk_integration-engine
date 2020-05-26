import { S3 } from "aws-sdk";
import * as moment from "moment-timezone";
import { config } from "../config";
import { log } from "../helpers";

const s3 = new S3({
  accessKeyId: config.s3.access_key_id,
  endpoint: config.s3.endpoint,
  s3ForcePathStyle: true, // needed with minio?
  secretAccessKey: config.s3.secret_access_key,
  signatureVersion: "v4",
});

export const  save = (data: any, name = "Unknown"): void =>  {
  if (config.s3.enabled && config.saveRawDataWhitelist[name]) {

    const now = moment().tz("Europe/Prague");
    name = `${name}/${now.format("YYYY-MM-DD")}/${now.format("HH_mm_ss.SSS")}`;

    const paramsBody = {
      Body: data,
      Bucket: config.s3.bucket_name,
      Key: name,
    };
    const options = {
        partSize: config.s3.upload_part_size * 1024 * 1024,
        queueSize: config.s3.upload_queue_size,
    };

    const u = s3.upload(paramsBody, options, (err: Error & {statusCode: number}) => {
        if (err) {
          log.error(`Saving raw data failed. (${name})`, {error: err});
        }
    });

    u.on("httpUploadProgress", (progress) => {
        log.verbose(`Raw data S3 upload \`${config.s3.bucket_name}/${name}: \`${progress.loaded} / ${progress.total}.`);
      });
  } else {
    log.verbose(`Raw data S3 upload not enabled for \`${name}\` datasource.`);
  }
};
