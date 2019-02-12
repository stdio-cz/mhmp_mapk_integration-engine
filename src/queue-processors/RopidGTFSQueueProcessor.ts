"use strict";

import * as amqplib from "amqplib";
import { RopidGTFS } from "data-platform-schema-definitions";
import CustomError from "../helpers/errors/CustomError";
import handleError from "../helpers/errors/ErrorHandler";
import log from "../helpers/Logger";
import RopidGTFSWorker from "../workers/RopidGTFSWorker";
import BaseQueueProcessor from "./BaseQueueProcessor";

const config = require("../config/ConfigLoader");

export default class RopidGTFSQueueProcessor extends BaseQueueProcessor {

    private queuePrefix: string;

    constructor(channel: amqplib.Channel) {
        super(channel);
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + RopidGTFS.name.toLowerCase();
    }

    public registerQueues = async (): Promise<void> => {
        await this.registerQueue(this.queuePrefix + ".checkForNewData",
            "*." + this.queuePrefix + ".checkForNewData", this.checkForNewData, {
                deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                deadLetterRoutingKey: "dead",
                messageTtl: 23 * 60 * 60 * 1000 });
        await this.registerQueue(this.queuePrefix + ".downloadFiles",
            "*." + this.queuePrefix + ".downloadFiles", this.downloadFiles, {
                deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                deadLetterRoutingKey: "dead",
                messageTtl: 23 * 60 * 60 * 1000 });
        await this.registerQueue(this.queuePrefix + ".transformData",
            "*." + this.queuePrefix + ".transformData", this.transformData, {
                deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                deadLetterRoutingKey: "dead",
                messageTtl: 23 * 60 * 60 * 1000 });
        await this.registerQueue(this.queuePrefix + ".saveDataToDB",
            "*." + this.queuePrefix + ".saveDataToDB", this.saveDataToDB, {
                deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                deadLetterRoutingKey: "dead",
                messageTtl: 23 * 60 * 60 * 1000 });
        await this.registerQueue(this.queuePrefix + ".checkingIfDone",
            "*." + this.queuePrefix + ".checkingIfDone", this.checkingIfDone, {
                deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                deadLetterRoutingKey: "dead",
                messageTtl: 23 * 60 * 60 * 1000 });
        await this.registerQueue(this.queuePrefix + ".downloadCisStops",
            "*." + this.queuePrefix + ".downloadCisStops", this.downloadCisStops, {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000 });
        await this.registerQueue(this.queuePrefix + ".refreshDataForDelayCalculation",
            "*." + this.queuePrefix + ".refreshDataForDelayCalculation", this.refreshDataForDelayCalculation, {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000 });
        await this.registerQueue(this.queuePrefix + ".saveDataForDelayCalculation",
            "*." + this.queuePrefix + ".saveDataForDelayCalculation", this.saveDataForDelayCalculation, {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead",
                    messageTtl: 23 * 60 * 60 * 1000 });
        await this.registerQueue(this.queuePrefix + ".checkingIfDoneDelayCalculation",
            "*." + this.queuePrefix + ".checkingIfDoneDelayCalculation", this.checkingIfDoneDelayCalculation, {
                deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                deadLetterRoutingKey: "dead",
                messageTtl: 23 * 60 * 60 * 1000 });
    }

    protected checkForNewData = async (msg: any): Promise<void> => {
        try {
            const worker = new RopidGTFSWorker();
            log.debug(" [>] " + this.queuePrefix + ".checkForNewData received some data.");
            await worker.checkForNewData();

            this.channel.ack(msg);
            log.debug(" [<] " + this.queuePrefix + ".checkForNewData: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg, false, false);
        }
    }

    protected downloadFiles = async (msg: any): Promise<void> => {
        try {
            const worker = new RopidGTFSWorker();
            log.debug(" [>] " + this.queuePrefix + ".downloadFiles received some data.");
            await worker.downloadFiles();

            this.channel.ack(msg);
            log.debug(" [<] " + this.queuePrefix + ".downloadFiles: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg, false, false);
        }
    }

    protected transformData = async (msg: any): Promise<void> => {
        try {
            const worker = new RopidGTFSWorker();
            log.debug(" [>] " + this.queuePrefix + ".transformData received some data.");
            await worker.transformData(JSON.parse(msg.content.toString()));

            this.channel.ack(msg);
            log.debug(" [<] " + this.queuePrefix + ".transformData: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg, false, false);
        }
    }

    protected saveDataToDB = async (msg: any): Promise<void> => {
        try {
            const worker = new RopidGTFSWorker();
            log.debug(" [>] " + this.queuePrefix + ".saveDataToDB received some data.");
            await worker.saveDataToDB(JSON.parse(msg.content.toString()));

            this.channel.ack(msg);
            log.debug(" [<] " + this.queuePrefix + ".saveDataToDB: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg, false, false);
        }
    }

    protected checkingIfDone = async (msg: any): Promise<void> => {
        try {
            const qt = await this.channel.checkQueue(this.queuePrefix + ".transformData");
            const qs = await this.channel.checkQueue(this.queuePrefix + ".saveDataToDB");
            const worker = new RopidGTFSWorker();

            if (qt.messageCount === 0 && qs.messageCount === 0) {
                if (await worker.checkSavedRowsAndReplaceTables()) {
                    this.channel.ack(msg);
                } else {
                    handleError(new CustomError("Error while checking RopidGTFS saved rows.", true,
                        this.constructor.name, 1021));
                    this.channel.nack(msg, false, false);
                }
                log.debug(" [<] " + this.queuePrefix + ".checkingIfDone: done");
            } else {
                await new Promise((done) => setTimeout(done, 5000)); // sleeps for 5 seconds
                this.channel.reject(msg);
            }
        } catch (err) {
            handleError(err);
            this.channel.nack(msg, false, false);
        }
    }

    protected downloadCisStops = async (msg: any): Promise<void> => {
        try {
            const worker = new RopidGTFSWorker();
            log.debug(" [>] " + this.queuePrefix + ".downloadCisStops received some data.");
            await worker.downloadCisStops();

            this.channel.ack(msg);
            log.debug(" [<] " + this.queuePrefix + ".downloadCisStops: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg, false, false);
        }
    }

    protected refreshDataForDelayCalculation = async (msg: any): Promise<void> => {
        try {
            const worker = new RopidGTFSWorker();
            log.debug(" [>] " + this.queuePrefix + ".refreshDataForDelayCalculation received some data.");
            await worker.refreshDataForDelayCalculation();

            this.channel.ack(msg);
            log.debug(" [<] " + this.queuePrefix + ".refreshDataForDelayCalculation: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg, false, false);
        }
    }

    protected saveDataForDelayCalculation = async (msg: any): Promise<void> => {
        try {
            const worker = new RopidGTFSWorker();
            log.debug(" [>] " + this.queuePrefix + ".saveDataForDelayCalculation received some data.");
            await worker.saveDataForDelayCalculation(JSON.parse(msg.content.toString()));

            this.channel.ack(msg);
            log.debug(" [<] " + this.queuePrefix + ".saveDataForDelayCalculation: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg, false, false);
        }
    }

    protected checkingIfDoneDelayCalculation = async (msg: any): Promise<void> => {
        try {
            const qs = await this.channel.checkQueue(this.queuePrefix + ".saveDataForDelayCalculation");
            const worker = new RopidGTFSWorker();

            if (qs.messageCount === 0) {
                if (await worker.checkSavedRowsAndReplaceTablesForDelayCalculation()) {
                    this.channel.ack(msg);
                } else {
                    handleError(new CustomError("Error while checking RopidGTFS saved rows.", true,
                        this.constructor.name, 1021));
                    this.channel.nack(msg, false, false);
                }
                log.debug(" [<] " + this.queuePrefix + ".checkingIfDoneDelayCalculation: done");
            } else {
                await new Promise((done) => setTimeout(done, 5000)); // sleeps for 5 seconds
                this.channel.reject(msg);
            }
        } catch (err) {
            handleError(err);
            this.channel.nack(msg, false, false);
        }
    }
}
