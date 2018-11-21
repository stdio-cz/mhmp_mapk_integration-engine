"use strict";

import ParkingZonesDataSource from "../datasources/ParkingZonesDataSource";
import ParkingZonesModel from "../models/ParkingZonesModel";
import ParkingZonesTransformation from "../transformations/ParkingZonesTransformation";

export default class ParkingZonesWorker {

    private model: ParkingZonesModel;
    private dataSource: ParkingZonesDataSource;
    private pipeline: ParkingZonesTransformation;

    constructor() {
        this.model = new ParkingZonesModel();
        this.dataSource = new ParkingZonesDataSource();
        this.pipeline = new ParkingZonesTransformation();
    }

    public refreshDataInDB = async (): Promise<any> => {
        const data = await this.dataSource.GetAll();
        const transformedData = await this.pipeline.TransformDataCollection(data);
        await this.model.SaveToDb(transformedData);
        return transformedData;
    }

}
