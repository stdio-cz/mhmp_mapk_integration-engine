"use strict";

import { CustomError } from "@golemio/errors";
import * as path from "path";
import { log } from "../helpers";
import { RedisModel } from "../models";
import { IFTPSettings, IProtocolStrategy } from "./";

import ftp = require("basic-ftp");
import decompress = require("decompress");
import fs = require("fs");
import moment = require("moment");

export class FTPProtocolStrategy implements IProtocolStrategy {

    private connectionSettings: IFTPSettings;

    constructor(settings: IFTPSettings) {
        this.connectionSettings = settings;
    }

    public setConnectionSettings(settings: IFTPSettings): void {
        this.connectionSettings = settings;
    }

    public async getData(): Promise<any> {
        const ftpClient = new ftp.Client();
        ftpClient.ftp.log = log.silly;
        ftpClient.ftp.silly = true;
        const tmpDir = this.connectionSettings.tmpDir;

        try {
            await ftpClient.access(this.connectionSettings.url);
            await ftpClient.cd(this.connectionSettings.path);
            await ftpClient.download(fs.createWriteStream(path.join(tmpDir, this.connectionSettings.filename)),
                this.connectionSettings.filename);

            let result = null;
            const prefix = path.parse(this.connectionSettings.filename).name + "/";
            const redisModel = new RedisModel("HTTPProtocolStrategy" + "Model", {
                isKeyConstructedFromData: false,
                prefix: "files",
            },
                null);

            if (this.connectionSettings.isCompressed) {
                const files = await decompress(path.join(tmpDir, this.connectionSettings.filename), {
                    filter: (this.connectionSettings.whitelistedFiles
                        && this.connectionSettings.whitelistedFiles.length)
                        ? (file: any) => this.connectionSettings.whitelistedFiles
                            .indexOf(file.path) !== -1
                        : (file: any) => file,
                });
                result = await Promise.all(files.map(async (file: any) => {
                    await redisModel.save(prefix + file.path, file.data.toString("hex"));
                    return {
                        filepath: prefix + file.path,
                        mtime: file.mtime,
                        name: path.parse(file.path).name,
                        path: file.path,
                    };
                }));
            } else if (this.connectionSettings.hasSubFiles) {
                let files = await this.readDir(path.join(tmpDir, this.connectionSettings.filename));
                if (this.connectionSettings.whitelistedFiles && this.connectionSettings.whitelistedFiles.length) {
                    files = files.filter((file: any) => this.connectionSettings.whitelistedFiles
                        .indexOf(file) !== -1);
                }
                result = await Promise.all(files.map(async (file: any) => {
                    const data = await this.readFile(path.join(tmpDir, prefix, file));
                    await redisModel.save(prefix + file, data.toString("hex"));
                    return {
                        filepath: prefix + file,
                        name: path.parse(file).name,
                        path: file,
                    };
                }));
            } else {
                const buffer = await this.readFile(path.join(tmpDir, this.connectionSettings.filename));
                result = Buffer.from(buffer).toString("utf8");
            }
            return result;
        } catch (err) {
            throw new CustomError("Error while getting data from server.", true, this.constructor.name, 2002, err);
        }
    }

    public async getLastModified(): Promise<string|null> {
        const ftpClient = new ftp.Client();
        ftpClient.ftp.log = log.silly;
        ftpClient.ftp.silly = true;

        try {
            await ftpClient.access(this.connectionSettings.url);
            await ftpClient.cd(this.connectionSettings.path);
            const lastModified = await ftpClient.lastMod(this.connectionSettings.filename);
            return (lastModified) ? moment(lastModified, "MM-DD-YYYY hh:mmA").toISOString() : null;
        } catch (err) {
            log.error(err);
            return null;
        }
    }

    private readFile(file: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const stream = fs.createReadStream(file);
            const chunks: any[] = [];

            stream.on("error", (err: Error) => {
                reject(err);
            });
            stream.on("data", (data: any) => {
                chunks.push(data);
            });
            stream.on("close", () => {
                resolve(Buffer.concat(chunks));
            });
        });
    }

    private readDir(dirPath: string): Promise<any> {
        return new Promise((resolve, reject) => {
            fs.readdir(dirPath, (err: Error, files: any) => {
                if (err) {
                    return reject(err);
                }
                return resolve(files);
            });
        });
    }

}
