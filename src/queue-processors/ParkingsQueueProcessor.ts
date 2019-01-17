"use strict";

import * as amqplib from "amqplib";
import { Parkings } from "data-platform-schema-definitions";
import handleError from "../helpers/errors/ErrorHandler";
import log from "../helpers/Logger";
import ParkingsWorker from "../workers/ParkingsWorker";
import BaseQueueProcessor from "./BaseQueueProcessor";

const config = require("../config/ConfigLoader");

export default class ParkingsQueueProcessor extends BaseQueueProcessor {

    private queuePrefix: string;

    constructor(channel: amqplib.Channel) {
        super(channel);
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + Parkings.name.toLowerCase();
    }

    public registerQueues = async (): Promise<void> => {
        await this.registerQueue(this.queuePrefix + ".refreshDataInDB",
            "*." + this.queuePrefix + ".refreshDataInDB", this.refreshDataInDB, {
                deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                deadLetterRoutingKey: "dead",
                messageTtl: 4 * 60 * 1000 });
        await this.registerQueue(this.queuePrefix + ".saveDataToHistory",
            "*." + this.queuePrefix + ".saveDataToHistory", this.saveDataToHistory, {
                deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                deadLetterRoutingKey: "dead" });
        await this.registerQueue(this.queuePrefix + ".updateAddressAndDistrict",
            "*." + this.queuePrefix + ".updateAddressAndDistrict", this.updateAddressAndDistrict, {
                deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                deadLetterRoutingKey: "dead",
                messageTtl: 4 * 60 * 1000 });
        await this.registerQueue(this.queuePrefix + ".updateAverageOccupancy",
            "*." + this.queuePrefix + ".updateAverageOccupancy", this.updateAverageOccupancy, {
                deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                deadLetterRoutingKey: "dead",
                messageTtl: 4 * 60 * 1000 });
    }

    protected refreshDataInDB = async (msg: any): Promise<void> => {
        try {
            const parkingsWorker = new ParkingsWorker();
            log.debug(" [>] " + this.queuePrefix + ".refreshDataInDB received some data.");
            await parkingsWorker.refreshDataInDB();

            this.channel.ack(msg);
            log.debug(" [<] " + this.queuePrefix + ".refreshDataInDB: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg, false, false);
        }
    }

    protected saveDataToHistory = async (msg: any): Promise<void> => {
        try {
            const parkingsWorker = new ParkingsWorker();
            log.debug(" [>] " + this.queuePrefix + ".saveDataToHistory received some data.");
            await parkingsWorker.saveDataToHistory(JSON.parse(msg.content.toString()));

            this.channel.ack(msg);
            log.debug(" [<] " + this.queuePrefix + ".saveDataToHistory: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg, false, false);
        }
    }

    protected updateAddressAndDistrict = async (msg: any): Promise<void> => {
        try {
            const parkingsWorker = new ParkingsWorker();
            log.debug(" [>] " + this.queuePrefix + ".updateAddressAndDistrict received some data.");
            await parkingsWorker.updateAddressAndDistrict(JSON.parse(msg.content.toString()));

            this.channel.ack(msg);
            log.debug(" [<] " + this.queuePrefix + ".updateAddressAndDistrict: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg, false, false);
        }
    }

    protected updateAverageOccupancy = async (msg: any): Promise<void> => {
        try {
            const parkingsWorker = new ParkingsWorker();
            log.debug(" [>] " + this.queuePrefix + ".updateAverageOccupancy received some data.");
            await parkingsWorker.updateAverageOccupancy(JSON.parse(msg.content.toString()));

            this.channel.ack(msg);
            log.debug(" [<] " + this.queuePrefix + ".updateAverageOccupancy: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg, false, false);
        }
    }

}
