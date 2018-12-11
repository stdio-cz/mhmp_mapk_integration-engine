"use strict";

import * as amqplib from "amqplib";
import handleError from "../helpers/errors/ErrorHandler";
import RopidGTFSWorker from "../workers/RopidGTFSWorker";
import BaseQueueProcessor from "./BaseQueueProcessor";

const log = require("debug")("data-platform:integration-engine:queue");
const config = require("../config/ConfigLoader");

export default class RopidGTFSQueueProcessor extends BaseQueueProcessor {

    private queuePrefix: string;

    constructor(channel: amqplib.Channel) {
        super(channel);
        // TODO brat jmeno ze schemat?
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + "RopidGTFS";
    }

    public registerQueues = async (): Promise<any> => {
        await this.registerQueue(this.queuePrefix + ".downloadFiles",
            "*." + this.queuePrefix + ".downloadFiles", this.downloadFiles);
        await this.registerQueue(this.queuePrefix + ".gtfs-transformData",
            "*." + this.queuePrefix + ".transformData", this.transformData);
        await this.registerQueue(this.queuePrefix + ".gtfs-saveDataToDB",
            "*." + this.queuePrefix + ".saveDataToDB", this.saveDataToDB);
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

}
