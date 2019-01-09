"use strict";

import VehiclePositionsStopsModel from "../models/VehiclePositionsStopsModel";
import VehiclePositionsTripsModel from "../models/VehiclePositionsTripsModel";
import VehiclePositionsTransformation from "../transformations/VehiclePositionsTransformation";
import BaseWorker from "./BaseWorker";

export default class VehiclePositionsWorker extends BaseWorker {

    private modelStops: VehiclePositionsStopsModel;
    private modelTrips: VehiclePositionsTripsModel;
    private transformation: VehiclePositionsTransformation;

    constructor() {
        super();
        this.modelStops = new VehiclePositionsStopsModel();
        this.modelTrips = new VehiclePositionsTripsModel();
        this.transformation = new VehiclePositionsTransformation();
    }

    public saveDataToDB = async (inputData): Promise<void> => {
        const transformedData = await this.transformation.TransformDataCollection(inputData);
        await this.modelStops.SaveToDb(transformedData.stops);
        await this.modelTrips.SaveToDb(transformedData.trips);
    }

}
