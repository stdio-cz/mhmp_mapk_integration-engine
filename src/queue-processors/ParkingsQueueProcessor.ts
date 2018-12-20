"use strict";

import * as amqplib from "amqplib";
import { Parkings } from "data-platform-schema-definitions";
import handleError from "../helpers/errors/ErrorHandler";
import ParkingsWorker from "../workers/ParkingsWorker";
import BaseQueueProcessor from "./BaseQueueProcessor";

const log = require("debug")("data-platform:integration-engine:queue");
const config = require("../config/ConfigLoader");

export default class ParkingsQueueProcessor extends BaseQueueProcessor {

    private queuePrefix: string;

    constructor(channel: amqplib.Channel) {
        super(channel);
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + Parkings.name.toLowerCase();
    }

    public registerQueues = async (): Promise<any> => {
        await this.registerQueue(this.queuePrefix + ".refreshDataInDB",
            "*." + this.queuePrefix + ".refreshDataInDB", this.refreshDataInDB);
        await this.registerQueue(this.queuePrefix + ".saveDataToHistory",
            "*." + this.queuePrefix + ".saveDataToHistory", this.saveDataToHistory);
        await this.registerQueue(this.queuePrefix + ".updateAddressAndDistrict",
            "*." + this.queuePrefix + ".updateAddressAndDistrict", this.updateAddressAndDistrict);
        await this.registerQueue(this.queuePrefix + ".updateAverageOccupancy",
            "*." + this.queuePrefix + ".updateAverageOccupancy", this.updateAverageOccupancy);
    }

    protected refreshDataInDB = async (msg: any): Promise<void> => {
        try {
            const parkingsWorker = new ParkingsWorker();
            log(" [>] " + this.queuePrefix + ".refreshDataInDB received some data.");
            const res = await parkingsWorker.refreshDataInDB();

            // historization
            await this.sendMessageToExchange("workers." + this.queuePrefix + ".saveDataToHistory",
                JSON.stringify(res.features));

            // TODO promyslet jestli je to spravne nebo to dat nekam jinam
            // updating district and address and average occupancy by JS Closure
            const parkings = res.features;
            const promises = parkings.map((p) => {
                this.sendMessageToExchange("workers." + this.queuePrefix + ".updateAddressAndDistrict",
                    JSON.stringify(p));
                this.sendMessageToExchange("workers." + this.queuePrefix + ".updateAverageOccupancy",
                    JSON.stringify(p));
            });
            await Promise.all(promises);

            this.channel.ack(msg);
            log(" [<] " + this.queuePrefix + ".refreshDataInDB: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg);
        }
    }

    protected saveDataToHistory = async (msg: any): Promise<void> => {
        try {
            const parkingsWorker = new ParkingsWorker();
            log(" [>] " + this.queuePrefix + ".saveDataToHistory received some data.");
            await parkingsWorker.saveDataToHistory(JSON.parse(msg.content.toString()));

            this.channel.ack(msg);
            log(" [<] " + this.queuePrefix + ".saveDataToHistory: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg);
        }
    }

    protected updateAddressAndDistrict = async (msg: any): Promise<void> => {
        try {
            const parkingsWorker = new ParkingsWorker();
            log(" [>] " + this.queuePrefix + ".updateAddressAndDistrict received some data.");
            await parkingsWorker.updateAddressAndDistrict(JSON.parse(msg.content.toString()));

            this.channel.ack(msg);
            log(" [<] " + this.queuePrefix + ".updateAddressAndDistrict: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg);
        }
    }

    protected updateAverageOccupancy = async (msg: any): Promise<void> => {
        try {
            const parkingsWorker = new ParkingsWorker();
            log(" [>] " + this.queuePrefix + ".updateAverageOccupancy received some data.");
            await parkingsWorker.updateAverageOccupancy(JSON.parse(msg.content.toString()));

            this.channel.ack(msg);
            log(" [<] " + this.queuePrefix + ".updateAverageOccupancy: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg);
        }
    }

}
