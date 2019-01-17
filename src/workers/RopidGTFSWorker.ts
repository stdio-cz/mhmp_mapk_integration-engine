"use strict";

import { RopidGTFS } from "data-platform-schema-definitions";

import RopidGTFSDataSource from "../datasources/RopidGTFSDataSource";
import IModel from "../models/IModel";
import AgencyModel from "../models/RopidGTFS/AgencyModel";
import CalendarDatesModel from "../models/RopidGTFS/CalendarDatesModel";
import CalendarModel from "../models/RopidGTFS/CalendarModel";
import RoutesModel from "../models/RopidGTFS/RoutesModel";
import ShapesModel from "../models/RopidGTFS/ShapesModel";
import StopsModel from "../models/RopidGTFS/StopsModel";
import StopTimesModel from "../models/RopidGTFS/StopTimesModel";
import TripsModel from "../models/RopidGTFS/TripsModel";
import RopidGTFSTransformation from "../transformations/RopidGTFSTransformation";
import BaseWorker from "./BaseWorker";

const fs = require("fs");
const config = require("../config/ConfigLoader");

export default class RopidGTFSWorker extends BaseWorker {

    private dataSource: RopidGTFSDataSource;
    private transformation: RopidGTFSTransformation;
    private queuePrefix: string;

    constructor() {
        super();
        this.dataSource = new RopidGTFSDataSource();
        this.transformation = new RopidGTFSTransformation();
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + RopidGTFS.name.toLowerCase();
    }

    public downloadFiles = async (): Promise<void> => {
        const files = await this.dataSource.GetAll();

        // send messages for transformation
        const promises = files.map((file) => {
            this.sendMessageToExchange("workers." + this.queuePrefix + ".transformData",
                new Buffer(JSON.stringify(file)));
        });
        await Promise.all(promises);

        // send message to checking if process is done
        this.sendMessageToExchange("workers." + this.queuePrefix + ".checkingIfDone",
            new Buffer(JSON.stringify({count: files.length})));
    }

    public transformData = async (inputData): Promise<void> => {
        inputData.data = await this.readFile(inputData.filepath);
        const transformedData = await this.transformation.TransformDataElement(inputData);
        const model = this.getModelByName(transformedData.name);
        await model.Truncate();

        // send messages for saving to DB
        const promises = transformedData.data.map((chunk) => {
            this.sendMessageToExchange("workers." + this.queuePrefix + ".saveDataToDB",
                new Buffer(JSON.stringify({
                    data: chunk,
                    name: transformedData.name,
                })));
        });
        await Promise.all(promises);
    }

    public saveDataToDB = async (inputData): Promise<void> => {
        const model = this.getModelByName(inputData.name);
        await model.SaveToDb(inputData.data);
    }

    private getModelByName = (name: string): IModel => {
        switch (name) {
            case "agency":
                return new AgencyModel();
            case "calendar":
                return new CalendarModel();
            case "calendar_dates":
                return new CalendarDatesModel();
            case "shapes":
                return new ShapesModel();
            case "stop_times":
                return new StopTimesModel();
            case "routes":
                return new RoutesModel();
            case "stops":
                return new StopsModel();
            case "trips":
                return new TripsModel();
            default:
                return null;
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
