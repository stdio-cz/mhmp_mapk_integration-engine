"use strict";

import * as path from "path";

// import { RopidGTFSCisStopsDataSource as schemaObject } from "data-platform-schema-definitions";
import CustomError from "../helpers/errors/CustomError";
import Validator from "../helpers/Validator";
import BaseDataSource from "./BaseDataSource";
import IDataSource from "./IDataSource";
import ISourceRequest from "./ISourceRequest";

const config = require("../config/ConfigLoader");
const ftp = require("basic-ftp");
const fs = require("fs");

/**
 * TODO rozdelit na HTTP a FTP data source
 */
export default class RopidGTFSCisStopsDataSource extends BaseDataSource implements IDataSource {

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
        this.name = "RopidGTFSCisStopsDataSource";
        this.sourceRequestObject = null;
        // TODO doplnit validator
        this.validator = null; // new Validator(this.name, schemaObject);
        this.resultsPath = "stopGroups";
        this.searchPath = "";
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
            await ftpClient.cd(config.datasources.RopidGTFSCisStopsPath);
            await ftpClient.download(fs.createWriteStream("/tmp/" + config.datasources.RopidGTFSCisStopsFilename),
                config.datasources.RopidGTFSCisStopsFilename);

            const buffer = await this.readFile("/tmp/" + config.datasources.RopidGTFSCisStopsFilename);
            const result = Buffer.from(buffer).toString("utf8");
            return this.GetSubElement(this.resultsPath, JSON.parse(result));
        } catch (err) {
            throw new CustomError("Retrieving of the source data failed.", true, this.name, 1002, err);
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

}
