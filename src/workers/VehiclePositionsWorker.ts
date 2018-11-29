"use strict";

import VehiclePositionsStopsModel from "../models/VehiclePositionsStopsModel";
import VehiclePositionsTripsModel from "../models/VehiclePositionsTripsModel";
import VehiclePositionsTransformation from "../transformations/VehiclePositionsTransformation";

export default class VehiclePositionsWorker {

    private modelStops: VehiclePositionsStopsModel;
    private modelTrips: VehiclePositionsTripsModel;
    private transformation: VehiclePositionsTransformation;

    constructor() {
        this.modelStops = new VehiclePositionsStopsModel();
        this.modelTrips = new VehiclePositionsTripsModel();
        this.transformation = new VehiclePositionsTransformation();
    }

    public saveDataToDB = async (inputData): Promise<any> => {
        const transformedData = await this.transformation.TransformDataCollection(inputData);
        await this.modelStops.SaveToDb(transformedData.stops);
        await this.modelTrips.SaveToDb(transformedData.trips);
        return transformedData;
    }

}
