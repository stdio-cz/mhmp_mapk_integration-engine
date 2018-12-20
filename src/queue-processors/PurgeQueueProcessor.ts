"use strict";

import * as amqplib from "amqplib";
import handleError from "../helpers/errors/ErrorHandler";
import PurgeWorker from "../workers/PurgeWorker";
import BaseQueueProcessor from "./BaseQueueProcessor";

const log = require("debug")("data-platform:integration-engine:queue");
const config = require("../config/ConfigLoader");

export default class PurgeQueueProcessor extends BaseQueueProcessor {

    private queuePrefix: string;

    constructor(channel: amqplib.Channel) {
        super(channel);
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + "purge";
    }

    public registerQueues = async (): Promise<any> => {
        await this.registerQueue(this.queuePrefix + ".deleteOldVehiclePositionsTrips",
            "*." + this.queuePrefix + ".deleteOldVehiclePositionsTrips", this.deleteOldVehiclePositionsTrips);
        await this.registerQueue(this.queuePrefix + ".deleteOldVehiclePositionsStops",
            "*." + this.queuePrefix + ".deleteOldVehiclePositionsStops", this.deleteOldVehiclePositionsStops);
        await this.registerQueue(this.queuePrefix + ".deleteOldMerakiAccessPointsObservations",
            "*." + this.queuePrefix + ".deleteOldMerakiAccessPointsObservations",
            this.deleteOldMerakiAccessPointsObservations);
    }

    protected deleteOldVehiclePositionsTrips = async (msg: any): Promise<any> => {
        try {
            const worker = new PurgeWorker();
            log(" [>] " + this.queuePrefix + ".deleteOldVehiclePositionsTrips received some data.");
            const res = await worker.deleteOldVehiclePositionsTrips();

            this.channel.ack(msg);
            log(" [<] " + this.queuePrefix + ".deleteOldVehiclePositionsTrips: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg);
        }
    }

    protected deleteOldVehiclePositionsStops = async (msg: any): Promise<any> => {
        try {
            const worker = new PurgeWorker();
            log(" [>] " + this.queuePrefix + ".deleteOldVehiclePositionsStops received some data.");
            const res = await worker.deleteOldVehiclePositionsStops();

            this.channel.ack(msg);
            log(" [<] " + this.queuePrefix + ".deleteOldVehiclePositionsStops: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg);
        }
    }

    protected deleteOldMerakiAccessPointsObservations = async (msg: any): Promise<any> => {
        try {
            const worker = new PurgeWorker();
            log(" [>] " + this.queuePrefix + ".deleteOldMerakiAccessPointsObservations received some data.");
            const res = await worker.deleteOldMerakiAccessPointsObservations();

            this.channel.ack(msg);
            log(" [<] " + this.queuePrefix + ".deleteOldMerakiAccessPointsObservations: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg);
        }
    }

}
