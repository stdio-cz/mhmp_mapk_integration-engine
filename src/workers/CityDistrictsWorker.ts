"use strict";

import CityDistrictsDataSource from "../datasources/CityDistrictsDataSource";
import CityDistrictsModel from "../models/CityDistrictsModel";
import CityDistrictsPipeline from "../pipelines/CityDistrictsPipeline";

export default class CityDistrictsWorker {

    private model: CityDistrictsModel;
    private dataSource: CityDistrictsDataSource;
    private pipeline: CityDistrictsPipeline;

    constructor() {
        this.model = new CityDistrictsModel();
        this.dataSource = new CityDistrictsDataSource();
        this.pipeline = new CityDistrictsPipeline();
    }

    public refreshDataInDB = async (): Promise<any> => {
        const data = await this.dataSource.GetAll();
        const transformedData = await this.pipeline.TransformDataCollection(data);
        await this.model.SaveToDb(transformedData);
        return transformedData;
    }

}
