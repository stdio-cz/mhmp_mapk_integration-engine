"use strict";

import * as amqplib from "amqplib";
import { RopidGTFS } from "data-platform-schema-definitions";
import handleError from "../helpers/errors/ErrorHandler";
import RopidGTFSWorker from "../workers/RopidGTFSWorker";
import BaseQueueProcessor from "./BaseQueueProcessor";

const log = require("debug")("data-platform:integration-engine:queue");
const doneLog = require("debug")("data-platform:integration-engine:queue:done");
const config = require("../config/ConfigLoader");

export default class RopidGTFSQueueProcessor extends BaseQueueProcessor {

    private queuePrefix: string;

    constructor(channel: amqplib.Channel) {
        super(channel);
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + RopidGTFS.name.toLowerCase();
    }

    public registerQueues = async (): Promise<any> => {
        await this.registerQueue(this.queuePrefix + ".downloadFiles",
            "*." + this.queuePrefix + ".downloadFiles", this.downloadFiles);
        await this.registerQueue(this.queuePrefix + ".transformData",
            "*." + this.queuePrefix + ".transformData", this.transformData);
        await this.registerQueue(this.queuePrefix + ".saveDataToDB",
            "*." + this.queuePrefix + ".saveDataToDB", this.saveDataToDB);
        await this.registerQueue(this.queuePrefix + ".checkingIfDone",
            "*." + this.queuePrefix + ".checkingIfDone", this.checkingIfDone);
    }

    protected downloadFiles = async (msg: any): Promise<any> => {
        try {
            const worker = new RopidGTFSWorker();
            log(" [>] " + this.queuePrefix + ".downloadFiles received some data.");
            const res = await worker.downloadFiles();

            this.channel.ack(msg);
            log(" [<] " + this.queuePrefix + ".downloadFiles: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg);
        }
    }

    protected transformData = async (msg: any): Promise<any> => {
        try {
            const worker = new RopidGTFSWorker();
            log(" [>] " + this.queuePrefix + ".transformData received some data.");
            const res = await worker.transformData(JSON.parse(msg.content.toString()));

            this.channel.ack(msg);
            log(" [<] " + this.queuePrefix + ".transformData: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg);
        }
    }

    protected saveDataToDB = async (msg: any): Promise<any> => {
        try {
            const worker = new RopidGTFSWorker();
            log(" [>] " + this.queuePrefix + ".saveDataToDB received some data.");
            const res = await worker.saveDataToDB(JSON.parse(msg.content.toString()));

            this.channel.ack(msg);
            log(" [<] " + this.queuePrefix + ".saveDataToDB: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg);
        }
    }

    protected checkingIfDone = async (msg: any): Promise<any> => {
        try {
            const qt = await this.channel.checkQueue(this.queuePrefix + ".transformData");
            const qs = await this.channel.checkQueue(this.queuePrefix + ".saveDataToDB");

            if (qt.messageCount === 0 && qs.messageCount === 0) {
                this.channel.ack(msg);
                doneLog(" [<] " + this.queuePrefix + ".checkingIfDone: done");
            } else {
                await new Promise((done) => setTimeout(done, 5000)); // sleeps for 5 seconds
                this.channel.reject(msg);
            }
        } catch (err) {
            handleError(err);
            this.channel.nack(msg);
        }
    }

}
