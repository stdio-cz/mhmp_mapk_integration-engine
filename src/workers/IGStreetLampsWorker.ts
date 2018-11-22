"use strict";

import IGStreetLampsDataSource from "../datasources/IGStreetLampsDataSource";
import IGStreetLampsModel from "../models/IGStreetLampsModel";
import IGStreetLampsTransformation from "../transformations/IGStreetLampsTransformation";

export default class IGStreetLampsWorker {

    private model: IGStreetLampsModel;
    private dataSource: IGStreetLampsDataSource;
    private transformation: IGStreetLampsTransformation;

    constructor() {
        this.model = new IGStreetLampsModel();
        this.dataSource = new IGStreetLampsDataSource();
        this.transformation = new IGStreetLampsTransformation();
    }

    public refreshDataInDB = async (): Promise<any> => {
        const data = await this.dataSource.GetAll();
        const transformedData = await this.transformation.TransformDataCollection(data);
        await this.model.SaveToDb(transformedData);
        return transformedData;
    }

}
