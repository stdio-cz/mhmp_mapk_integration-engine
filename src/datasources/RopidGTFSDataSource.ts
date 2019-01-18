"use strict";

import * as path from "path";

// import { RopidGTFSDataSource as schemaObject } from "data-platform-schema-definitions";
import CustomError from "../helpers/errors/CustomError";
import Validator from "../helpers/Validator";
import BaseDataSource from "./BaseDataSource";
import IDataSource from "./IDataSource";
import ISourceRequest from "./ISourceRequest";

const config = require("../config/ConfigLoader");
const ftp = require("basic-ftp");
const decompress = require("decompress");
const fs = require("fs");
const moment = require("moment");

/**
 * TODO rozdelit na HTTP a FTP data source
 */
export default class RopidGTFSDataSource extends BaseDataSource implements IDataSource {

    /** The name of the data source. */
    public name: string;
    /** The object which specifies HTTP request. */
    protected sourceRequestObject: ISourceRequest;
    /** Validation helper */
    protected validator: Validator;
    /** Specifies where to look for the unique identifier of the object to find it in the collection. */
    protected searchPath: string;
    /** Specifies where is the collection of the individual results stored in the returned object. */
    protected resultsPath: string;

    constructor() {
        super();
        this.name = "RopidGTFSDataSource";
        this.sourceRequestObject = null;
        // TODO doplnit validator
        this.validator = null; // new Validator(this.name, schemaObject);
        this.resultsPath = "";
        this.searchPath = "name";
    }

    /**
     * Override
     */
    public GetAll = async (): Promise<any> => {
        const data = await this.GetRawData();
        if (this.validator) {
            await this.validator.Validate(data);
        }
        return data;
    }

    public getLastModified = async (): Promise<string> => {
        const ftpClient = new ftp.Client();
        // ftpClient.ftp.verbose = true;

        try {
            await ftpClient.access(config.datasources.RopidFTP);
            await ftpClient.cd(config.datasources.RopidGTFSPath);
            const lastModified = await ftpClient.lastMod(config.datasources.RopidGTFSFilename);
            return moment(lastModified, "MM-DD-YYYY hh:mmA").toISOString();
        } catch (err) {
            throw new CustomError("Retrieving of the source data failed.", true, this.name, 1002, err);
        }
    }

    /**
     * Method that connects to remote data endpoint and gets the raw data.
     *
     * @returns {Promise<any>} Promise with returned data.
     */
    protected GetRawData = async (): Promise<any> => {

        const ftpClient = new ftp.Client();
        // ftpClient.ftp.verbose = true;

        try {
            await ftpClient.access(config.datasources.RopidFTP);
            await ftpClient.cd(config.datasources.RopidGTFSPath);
            const lastModified = await ftpClient.lastMod(config.datasources.RopidGTFSFilename);
            await ftpClient.download(fs.createWriteStream("/tmp/" + config.datasources.RopidGTFSFilename),
                config.datasources.RopidGTFSFilename);
            const whitelist = [
                "agency", "calendar", "calendar_dates",
                "shapes", "stop_times", "stops", "routes", "trips",
            ];
            const tmpDir = "/tmp/PID_GTFS/";
            let files = await decompress("/tmp/" + config.datasources.RopidGTFSFilename, tmpDir, {
                filter: (file) => whitelist.indexOf(file.path.replace(".txt", "")) !== -1,
            });
            files = files.map((file) => {
                return {
                    filepath: tmpDir + file.path,
                    mtime: file.mtime,
                    name: file.path.replace(".txt", ""),
                    path: file.path,
                };
            });
            return { files, last_modified: moment(lastModified, "MM-DD-YYYY hh:mmA").toISOString() };
        } catch (err) {
            throw new CustomError("Retrieving of the source data failed.", true, this.name, 1002, err);
        }
    }

}
