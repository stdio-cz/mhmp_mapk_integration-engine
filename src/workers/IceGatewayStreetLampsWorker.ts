"use strict";

import IceGatewayStreetLampsDataSource from "../datasources/IceGatewayStreetLampsDataSource";
import IceGatewayStreetLampsModel from "../models/IceGatewayStreetLampsModel";
import IceGatewayStreetLampsTransformation from "../transformations/IceGatewayStreetLampsTransformation";

export default class IceGatewayStreetLampsWorker {

    private model: IceGatewayStreetLampsModel;
    private dataSource: IceGatewayStreetLampsDataSource;
    private transformation: IceGatewayStreetLampsTransformation;

    constructor() {
        this.model = new IceGatewayStreetLampsModel();
        this.dataSource = new IceGatewayStreetLampsDataSource();
        this.transformation = new IceGatewayStreetLampsTransformation();
    }

    public refreshDataInDB = async (): Promise<any> => {
        const data = await this.dataSource.GetAll();
        const transformedData = await this.transformation.TransformDataCollection(data);
        await this.model.SaveToDb(transformedData);
        return transformedData;
    }

}
