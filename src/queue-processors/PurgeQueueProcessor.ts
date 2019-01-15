"use strict";

import * as amqplib from "amqplib";
import handleError from "../helpers/errors/ErrorHandler";
import log from "../helpers/Logger";
import PurgeWorker from "../workers/PurgeWorker";
import BaseQueueProcessor from "./BaseQueueProcessor";

const config = require("../config/ConfigLoader");

export default class PurgeQueueProcessor extends BaseQueueProcessor {

    private queuePrefix: string;

    constructor(channel: amqplib.Channel) {
        super(channel);
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + "purge";
    }

    public registerQueues = async (): Promise<void> => {
        await this.registerQueue(this.queuePrefix + ".deleteOldVehiclePositionsTrips",
            "*." + this.queuePrefix + ".deleteOldVehiclePositionsTrips", this.deleteOldVehiclePositionsTrips, {
                deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                deadLetterRoutingKey: "dead" });
        await this.registerQueue(this.queuePrefix + ".deleteOldVehiclePositionsStops",
            "*." + this.queuePrefix + ".deleteOldVehiclePositionsStops", this.deleteOldVehiclePositionsStops, {
                deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                deadLetterRoutingKey: "dead" });
        await this.registerQueue(this.queuePrefix + ".deleteOldMerakiAccessPointsObservations",
            "*." + this.queuePrefix + ".deleteOldMerakiAccessPointsObservations",
                this.deleteOldMerakiAccessPointsObservations, {
                    deadLetterExchange: config.RABBIT_EXCHANGE_NAME,
                    deadLetterRoutingKey: "dead" });
    }

    protected deleteOldVehiclePositionsTrips = async (msg: any): Promise<void> => {
        try {
            const worker = new PurgeWorker();
            log.debug(" [>] " + this.queuePrefix + ".deleteOldVehiclePositionsTrips received some data.");
            await worker.deleteOldVehiclePositionsTrips();

            this.channel.ack(msg);
            log.debug(" [<] " + this.queuePrefix + ".deleteOldVehiclePositionsTrips: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg, false, false);
        }
    }

    protected deleteOldVehiclePositionsStops = async (msg: any): Promise<void> => {
        try {
            const worker = new PurgeWorker();
            log.debug(" [>] " + this.queuePrefix + ".deleteOldVehiclePositionsStops received some data.");
            await worker.deleteOldVehiclePositionsStops();

            this.channel.ack(msg);
            log.debug(" [<] " + this.queuePrefix + ".deleteOldVehiclePositionsStops: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg, false, false);
        }
    }

    protected deleteOldMerakiAccessPointsObservations = async (msg: any): Promise<void> => {
        try {
            const worker = new PurgeWorker();
            log.debug(" [>] " + this.queuePrefix + ".deleteOldMerakiAccessPointsObservations received some data.");
            await worker.deleteOldMerakiAccessPointsObservations();

            this.channel.ack(msg);
            log.debug(" [<] " + this.queuePrefix + ".deleteOldMerakiAccessPointsObservations: done");
        } catch (err) {
            handleError(err);
            this.channel.nack(msg, false, false);
        }
    }

}
