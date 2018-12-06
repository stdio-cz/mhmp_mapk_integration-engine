"use strict";

import * as amqplib from "amqplib";
import handleError from "../helpers/errors/ErrorHandler";
import RopidGTFSWorker from "../workers/RopidGTFSWorker";
import BaseQueueProcessor from "./BaseQueueProcessor";

const log = require("debug")("data-platform:integration-engine");

export default class RopidGTFSQueueProcessor extends BaseQueueProcessor {

    constructor(channel: amqplib.Channel) {
        super(channel);
    }

    public registerQueues = async (): Promise<any> => {
        await this.registerQueue("ropid-gtfs-downloadFiles",
            "*.ropid-gtfs.downloadFiles", this.downloadFiles);
        await this.registerQueue("ropid-gtfs-transformData",
            "*.ropid-gtfs.transformData", this.transformData);
        await this.registerQueue("ropid-gtfs-saveDataToDB",
            "*.ropid-gtfs.saveDataToDB", this.saveDataToDB);
    }

    protected downloadFiles = async (msg: any): Promise<any> => {
        try {
            const worker = new RopidGTFSWorker();
            log(" [>] ropid-gtfs-downloadFiles received some data.");
            const res = await worker.downloadFiles();

            this.channel.ack(msg);
            log(" [<] ropid-gtfs-downloadFiles: done");
        } catch (err) {
            handleError(err);
            this.channel.ack(msg);
        }
    }

    protected transformData = async (msg: any): Promise<any> => {
        try {
            const worker = new RopidGTFSWorker();
            log(" [>] ropid-gtfs-transformData received some data.");
            const res = await worker.transformData(JSON.parse(msg.content.toString()));

            this.channel.ack(msg);
            log(" [<] ropid-gtfs-transformData: done");
        } catch (err) {
            handleError(err);
            this.channel.ack(msg);
        }
    }

    protected saveDataToDB = async (msg: any): Promise<any> => {
        try {
            const worker = new RopidGTFSWorker();
            log(" [>] ropid-gtfs-saveDataToDB received some data.");
            const res = await worker.saveDataToDB(JSON.parse(msg.content.toString()));

            this.channel.ack(msg);
            log(" [<] ropid-gtfs-saveDataToDB: done");
        } catch (err) {
            handleError(err);
            this.channel.ack(msg);
        }
    }

}
