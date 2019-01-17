"use strict";

import * as amqplib from "amqplib";
import { RopidGTFS } from "data-platform-schema-definitions";
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

            if (qt.messageCount === 0 && qs.messageCount === 0) {
                this.channel.ack(msg);
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

}
