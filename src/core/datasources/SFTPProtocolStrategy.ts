"use strict";

import { CustomError } from "@golemio/errors";
import { IProtocolStrategy, ISFTPSettings } from "./";
import { ProtocolStrategy } from "./ProtocolStrategy";

import * as Sftp from "ssh2-sftp-client";

import * as iconv from "iconv-lite";

import * as fs from "fs";
export class SFTPProtocolStrategy extends ProtocolStrategy implements IProtocolStrategy {

    protected connectionSettings: ISFTPSettings;
    private sftpClient: Sftp;
    private connected = false;

    constructor(settings: ISFTPSettings) {
        super(settings);
        this.sftpClient = new Sftp();
    }

    public setConnectionSettings = (settings: ISFTPSettings): void => {
        this.connectionSettings = settings;
    }

    public getRawData = async (): Promise<any> => {
        try {
            // for testing
            // return iconv.decode(
            //     fs.readFileSync("/home/towdie/NadSv_2020-11-10.CSV"), this.connectionSettings.encoding,
            //     //await this.sftpClient.get(`/${lastMod.name}`) as Buffer, this.connectionSettings.encoding,
            // );
            await this.connect();

            let lastModTime = 0;
            let lastMod: any;

            (await this.sftpClient.list(this.connectionSettings.path || "/")).forEach((file: any) => {
                if (file.modifyTime > lastModTime) {
                    lastModTime = file.modifyTime;
                    lastMod = file;
                }
            });

            return {
                data: iconv.decode(
                    await this.sftpClient.get(
                    `/${this.connectionSettings.filename}`) as Buffer,
                    this.connectionSettings.encoding,
                ),
            };
        } catch (err) {
            throw new CustomError("Error while getting data from server.", true, this.constructor.name, 2002, err);
        }
    }

    public getLastModified = async (): Promise<string | null> => {
        try {
            // for testing
            // return iconv.decode(
            //     fs.readFileSync("/home/towdie/NadSv_2020-11-10.CSV"), this.connectionSettings.encoding,
            //     //await this.sftpClient.get(`/${lastMod.name}`) as Buffer, this.connectionSettings.encoding,
            // );
            await this.connect();

            let lastModTime = 0;
            let lastMod: any;

            (await this.sftpClient.list(this.connectionSettings.path || "/")).forEach((file: any) => {
                if (file.modifyTime > lastModTime) {
                    lastModTime = file.modifyTime;
                    lastMod = file;
                }
            });

            return lastMod.name;
        } catch (err) {
            throw new CustomError("Error while getting data from server.", true, this.constructor.name, 2002, err);
        }
    }

    private connect = async (): Promise<void> => {
        if (!this.connected) {
            await this.sftpClient.connect({
                algorithms: this.connectionSettings.algorithms,
                host: this.connectionSettings.host,
                password: this.connectionSettings.password,
                port: this.connectionSettings.port,
                username: this.connectionSettings.username,
            });
            this.connected = true;
        }
    }
}
