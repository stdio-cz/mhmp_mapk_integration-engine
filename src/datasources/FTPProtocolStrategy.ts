"use strict";

import * as path from "path";
import CustomError from "../helpers/errors/CustomError";
import log from "../helpers/Logger";
import { IFTPSettings, IProtocolStrategy } from "./IProtocolStrategy";

const decompress = require("decompress");
const fs = require("fs");
const ftp = require("basic-ftp");
const moment = require("moment");

export default class FTPProtocolStrategy implements IProtocolStrategy {

    private connectionSettings: IFTPSettings;

    constructor(settings: IFTPSettings) {
        this.connectionSettings = settings;
    }

    public setConnectionSettings = (settings: IFTPSettings): void => {
        this.connectionSettings = settings;
    }

    public getData = async (): Promise<any> => {
        const ftpClient = new ftp.Client();
        ftpClient.ftp.log = log.silly;
        ftpClient.ftp.silly = true;

        try {
            await ftpClient.access(this.connectionSettings.url);
            await ftpClient.cd(this.connectionSettings.path);
            await ftpClient.download(fs.createWriteStream("/tmp/" + this.connectionSettings.filename),
                this.connectionSettings.filename);

            let result = null;

            if (this.connectionSettings.isCompressed) {
                const tmpDir = "/tmp/" + path.parse(this.connectionSettings.filename).name + "/";
                const files = await decompress("/tmp/" + this.connectionSettings.filename, tmpDir, {
                    filter: (this.connectionSettings.whitelistedFiles.length)
                        ? (file) => this.connectionSettings.whitelistedFiles
                            .indexOf(file.path) !== -1
                        : (file) => file,
                });
                result = files.map((file) => {
                    return {
                        filepath: tmpDir + file.path,
                        mtime: file.mtime,
                        name: path.parse(file.path).name,
                        path: file.path,
                    };
                });
            } else if (this.connectionSettings.hasSubFiles) {
                result = await this.readDir("/tmp/" + this.connectionSettings.filename);
                if (this.connectionSettings.whitelistedFiles.length) {
                    result = result.filter((file) => this.connectionSettings.whitelistedFiles
                        .indexOf(file.path) !== -1);
                }
            } else if (this.connectionSettings.onlySavedToTmpDir) {
                const stat = await this.readFileStat("/tmp/" + this.connectionSettings.filename);
                result = {
                    filepath: "/tmp/" + this.connectionSettings.filename,
                    mtime: stat.mtime,
                    name: path.parse(this.connectionSettings.filename).name,
                    path: "/tmp/",
                };
            } else {
                const buffer = await this.readFile("/tmp/" + this.connectionSettings.filename);
                result = Buffer.from(buffer).toString("utf8");
            }
            return result;
        } catch (err) {
            throw new CustomError("Retrieving of the source data failed.", true, this.constructor.name, 1002, err);
        }
    }

    public getLastModified = async (): Promise<string> => {
        const ftpClient = new ftp.Client();
        ftpClient.ftp.log = log.silly;
        ftpClient.ftp.silly = true;

        try {
            await ftpClient.access(this.connectionSettings.url);
            await ftpClient.cd(this.connectionSettings.path);
            const lastModified = await ftpClient.lastMod(this.connectionSettings.filename);
            return (lastModified) ? moment(lastModified, "MM-DD-YYYY hh:mmA").toISOString() : null;
        } catch (err) {
            throw new CustomError("Retrieving of the source data failed.", true, this.constructor.name, 1002, err);
        }
    }

    private readFile = (file: string): Promise<Buffer> => {
        return new Promise((resolve, reject) => {
            const stream = fs.createReadStream(file);
            const chunks = [];

            stream.on("error", (err) => {
                reject(err);
            });
            stream.on("data", (data) => {
                chunks.push(data);
            });
            stream.on("close", () => {
                resolve(Buffer.concat(chunks));
            });
        });
    }

    private readDir = (dirPath: string): Promise<any> => {
        return new Promise((resolve, reject) => {
            fs.readdir(dirPath, (err, files) => {
                if (err) {
                    return reject(err);
                }
                return resolve(files);
            });
        });
    }

    private readFileStat = (filePath: string): Promise<any> => {
        return new Promise((resolve, reject) => {
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    return reject(err);
                }
                return resolve(stats);
            });
        });
    }

}
