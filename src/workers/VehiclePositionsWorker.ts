"use strict";

import { VehiclePositions } from "data-platform-schema-definitions";
import VehiclePositionsPositionsModel from "../models/VehiclePositionsPositionsModel";
import VehiclePositionsStopsModel from "../models/VehiclePositionsStopsModel";
import VehiclePositionsTripsModel from "../models/VehiclePositionsTripsModel";
import VehiclePositionsTransformation from "../transformations/VehiclePositionsTransformation";
import BaseWorker from "./BaseWorker";

const config = require("../config/ConfigLoader");

export default class VehiclePositionsWorker extends BaseWorker {

    private modelPositions: VehiclePositionsPositionsModel;
    private modelStops: VehiclePositionsStopsModel;
    private modelTrips: VehiclePositionsTripsModel;
    private transformation: VehiclePositionsTransformation;
    private queuePrefix: string;

    constructor() {
        super();
        this.modelPositions = new VehiclePositionsPositionsModel();
        this.modelStops = new VehiclePositionsStopsModel();
        this.modelTrips = new VehiclePositionsTripsModel();
        this.transformation = new VehiclePositionsTransformation();
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + VehiclePositions.name.toLowerCase();
    }

    public saveDataToDB = async (inputData): Promise<void> => {
        const transformedData = await this.transformation.TransformDataCollection(inputData);
        await this.modelPositions.SaveToDb(transformedData.positions);
        await this.modelStops.SaveToDb(transformedData.stops);
        const newRows = await this.modelTrips.SaveToDb(transformedData.trips);

        // send message for update GTFSTripIds
        const promises = newRows.map((trip) => {
            this.sendMessageToExchange("workers." + this.queuePrefix + ".updateGTFSTripId",
                JSON.stringify(trip));
        });
        await Promise.all(promises);
    }

    public getTripsWithoutGTFSTripId = async (): Promise<void> => {
        const toUpdate = await this.modelTrips.getTripsWithoutGTFSTripId();

        // send messages for updating district and address and average occupancy
        const promises = toUpdate.map((tripToUpdate) => {
            this.sendMessageToExchange("workers." + this.queuePrefix + ".updateGTFSTripId",
                JSON.stringify(tripToUpdate));
        });
        await Promise.all(promises);
    }

    public updateGTFSTripId = async (data: any): Promise<void> => {
        await this.modelTrips.findAndUpdateGTFSTripId(data);
    }
}
