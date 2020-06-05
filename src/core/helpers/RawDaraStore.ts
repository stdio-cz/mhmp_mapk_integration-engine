import { S3 } from "aws-sdk";
import * as contentType from "content-type";
import * as moment from "moment-timezone";
import { contentTypeToExtension } from "../../core/helpers";
import { config } from "../config";
import { log } from "../helpers";

const s3 = new S3({
  accessKeyId: config.s3.access_key_id,
  endpoint: config.s3.endpoint,
  s3ForcePathStyle: true, // needed with minio?
  secretAccessKey: config.s3.secret_access_key,
  signatureVersion: "v4",
});

export const  save = (data: any, meta: any, name = "Unknown"): void =>  {
  if (config.s3.enabled && config.saveRawDataWhitelist[name]) {

    const now = moment().tz("Europe/Prague");

    let ext = null;
    let headers = null;

    if (meta.headers) {
      try {
        headers = JSON.stringify(meta.headers, null, 2);
      } catch {
        null;
      }
      try {
        ext = `.${contentTypeToExtension[(contentType.parse(meta.headers["content-type"]) || {}).type]}`;
      } catch {
        null;
      }
    }

    const fileName = `${name}/${now.format("YYYY-MM-DD")}/${now.format("HH_mm_ss.SSS")}`;

    const paramsBodyData = {
      Body: data,
      Bucket: config.s3.bucket_name,
      Key: `${fileName}${ext || ""}`,
    };

    const paramsBodyHeaders = {
      Body: headers,
      Bucket: config.s3.bucket_name,
      Key: `${fileName}_headers.json`,
    };

    const options = {
        partSize: config.s3.upload_part_size * 1024 * 1024,
        queueSize: config.s3.upload_queue_size,
    };

    const uploadData = s3.upload(paramsBodyData, options, (err: Error & {statusCode: number}) => {
        if (err) {
          log.error(`Saving raw data failed. (${fileName})`, {error: err});
        }
    });

    uploadData.on("httpUploadProgress", (progress) => {
        log.verbose(`Raw data S3 upload \`
        ${config.s3.bucket_name}/${fileName}: \`${progress.loaded} / ${progress.total}.`);
    });

    if (
      config.saveRawDataWhitelist[name].saveHeaders &&
      headers && meta.statusCode &&
      meta.statusCode !== 200
    ) {
        const uploadHeaders = s3.upload(paramsBodyHeaders, options, (err: Error & {statusCode: number}) => {
          if (err) {
            log.error(`Saving raw data headers failed. (${fileName}.headers)`, {error: err});
          }
        });

        uploadHeaders.on("httpUploadProgress", (progress) => {
            log.verbose(`Raw data headers S3 upload \`
            ${config.s3.bucket_name}/${fileName}.headers: \`${progress.loaded} / ${progress.total}.`);
        });
    }
  } else {
    log.verbose(`Raw data S3 upload not enabled for \`${name}\` datasource.`);
  }
};
