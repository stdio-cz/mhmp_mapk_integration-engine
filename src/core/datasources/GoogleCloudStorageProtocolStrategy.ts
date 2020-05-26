"use strict";

import { CustomError } from "@golemio/errors";
import { File, Storage } from "@google-cloud/storage";
import { RedisModel } from "../models";
import { IGoogleCloudStorageSettings, IProtocolStrategy } from "./";

import { ProtocolStrategy } from "./ProtocolStrategy";

export class GoogleCloudStorageProtocolStrategy extends ProtocolStrategy implements IProtocolStrategy {

    protected connectionSettings: IGoogleCloudStorageSettings;
    private storage: Storage;

    constructor(settings: IGoogleCloudStorageSettings) {
        super(settings);
        this.storage = new Storage({ keyFilename: settings.keyFilename });
    }

    public setConnectionSettings = (settings: IGoogleCloudStorageSettings): void => {
        this.connectionSettings = settings;
        this.storage = new Storage({ keyFilename: settings.keyFilename });
    }

    public getRawData = async (): Promise<any> => {
        try {
            // Lists files in the bucket
            let [ files ] = await this.storage
                .bucket(this.connectionSettings.bucketName)
                .getFiles({
                    prefix: this.connectionSettings.filesPrefix,
                });

            // Filter files by filter function
            if (this.connectionSettings.filesFilter) {
                files = files.filter(this.connectionSettings.filesFilter);
            }

            const redisModel = new RedisModel(
                "GoogleCloudStorageProtocolStrategy" + "Model",
                {
                    isKeyConstructedFromData: false,
                    prefix: "files",
                },
                null,
            );

            const result = files.map(async (file: File) => {
                const fileBuffer = await this.storage
                    .bucket(this.connectionSettings.bucketName)
                    .file(file.name)
                    .download();

                const filepath = `${this.connectionSettings.bucketName}/${file.name}`;
                await redisModel.save(
                    filepath,
                    fileBuffer[0].toString("utf16le"),
                );
                return {
                    filepath,
                    name: file.name,
                };
            });

            return await Promise.all(result);
        } catch (err) {
            throw new CustomError("Error while getting data from server.", true, this.constructor.name, 2002, err);
        }
    }

    public getLastModified = async (): Promise<string | null> => {
        throw new Error("Method not implemented.");
    }

}
