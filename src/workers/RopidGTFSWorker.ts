"use strict";

import RopidGTFSDataSource from "../datasources/RopidGTFSDataSource";
import CustomError from "../helpers/errors/CustomError";
import AgencyModel from "../models/RopidGTFS/AgencyModel";
import CalendarDatesModel from "../models/RopidGTFS/CalendarDatesModel";
import CalendarModel from "../models/RopidGTFS/CalendarModel";
import RoutesModel from "../models/RopidGTFS/RoutesModel";
import ShapesModel from "../models/RopidGTFS/ShapesModel";
import StopsModel from "../models/RopidGTFS/StopsModel";
import StopTimesModel from "../models/RopidGTFS/StopTimesModel";
import TripsModel from "../models/RopidGTFS/TripsModel";
import RopidGTFSTransformation from "../transformations/RopidGTFSTransformation";

const { amqpChannel } = require("../helpers/AMQPConnector");
const config = require("../config/ConfigLoader");

export default class RopidGTFSWorker {

    private datasource: RopidGTFSDataSource;
    private transformation: RopidGTFSTransformation;
    private queuePrefix: string;

    constructor() {
        this.datasource = new RopidGTFSDataSource();
        this.transformation = new RopidGTFSTransformation();
        // TODO brat jmeno ze schemat?
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + "RopidGTFS";
    }

    public downloadFiles = async (): Promise<void> => {
        const files = await this.datasource.GetAll();
        const channel = await amqpChannel;
        const promises = files.map((file) => {
            try {
                channel.assertExchange(config.RABBIT_EXCHANGE_NAME, "topic", {durable: false});
                channel.publish(config.RABBIT_EXCHANGE_NAME,
                    "workers." + this.queuePrefix + ".transformData",
                    new Buffer(JSON.stringify(file)));
            } catch (err) {
                throw new CustomError("Sending the message to exchange failed.", true,
                    this.constructor.name, 1001, err);
            }
        });
        await Promise.all(promises);
    }

    public transformData = async (inputData): Promise<any> => {
        const transformedData = await this.transformation.TransformDataElement(inputData);
        const model = this.getModelByName(transformedData.name);
        await model.Truncate();
        const channel = await amqpChannel;
        const promises = transformedData.data.map((chunk) => {
            try {
                channel.assertExchange(config.RABBIT_EXCHANGE_NAME, "topic", {durable: false});
                channel.publish(config.RABBIT_EXCHANGE_NAME,
                    "workers." + this.queuePrefix + ".saveDataToDB",
                    new Buffer(JSON.stringify({
                        data: chunk,
                        name: transformedData.name,
                    }),
                ));
            } catch (err) {
                throw new CustomError("Sending the message to exchange failed.", true,
                    this.constructor.name, 1001, err);
            }
        });
        await Promise.all(promises);
    }

    public saveDataToDB = async (inputData): Promise<any> => {
        const model = this.getModelByName(inputData.name);
        await model.SaveToDb(inputData.data);
    }

    private getModelByName = (name: string) => {
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

}
