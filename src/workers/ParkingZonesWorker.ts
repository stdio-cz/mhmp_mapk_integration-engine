"use strict";

import ParkingZonesDataSource from "../datasources/ParkingZonesDataSource";
import ParkingZonesTariffsDataSource from "../datasources/ParkingZonesTariffsDataSource";
import ParkingZonesModel from "../models/ParkingZonesModel";
import ParkingZonesTransformation from "../transformations/ParkingZonesTransformation";
import BaseWorker from "./BaseWorker";

export default class ParkingZonesWorker extends BaseWorker {

    private model: ParkingZonesModel;
    private dataSource: ParkingZonesDataSource;
    private dataSourceTariffs: ParkingZonesTariffsDataSource;
    private transformation: ParkingZonesTransformation;

    constructor() {
        super();
        this.model = new ParkingZonesModel();
        this.dataSource = new ParkingZonesDataSource();
        this.dataSourceTariffs = new ParkingZonesTariffsDataSource();
        this.transformation = new ParkingZonesTransformation();
    }

    public refreshDataInDB = async (): Promise<void> => {
        const data = await this.dataSource.GetAll();
        await this.transformation.setTariffs(await this.dataSourceTariffs.GetAll());
        const transformedData = await this.transformation.TransformDataCollection(data);
        await this.model.SaveToDb(transformedData);
    }

}
