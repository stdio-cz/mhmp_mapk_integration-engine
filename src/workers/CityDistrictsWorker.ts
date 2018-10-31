"use strict";

import CityDistrictsDataSource from "../datasources/CityDistrictsDataSource";
import CustomError from "../helpers/errors/CustomError";
import CityDistrictsModel from "../models/CityDistrictsModel";
import CityDistrictsPipeline from "../pipelines/CityDistrictsPipeline";

export default class CityDistrictsWorker {

    private cityDistrictsModel: CityDistrictsModel;
    private cityDistrictsDataSource: CityDistrictsDataSource;
    private cityDistrictsPipeline: CityDistrictsPipeline;

    constructor() {
        this.cityDistrictsModel = new CityDistrictsModel();
        this.cityDistrictsDataSource = new CityDistrictsDataSource();
        this.cityDistrictsPipeline = new CityDistrictsPipeline();
    }

    public refreshDataInDB = async (): Promise<any> => {
        const data = await this.cityDistrictsDataSource.GetAll();
        const transformedData = await this.cityDistrictsPipeline.TransformDataCollection(data);
        const isValid = await this.cityDistrictsModel.Validate(transformedData);
        if (!isValid) {
            throw new CustomError("Transformed data are not valid.", true, 1011);
        } else {
            await this.cityDistrictsModel.SaveToDb(transformedData);
            /*
            const removeRes =
                await this.cityDistrictsModel.RemoveOldRecords(config.refreshTimesInMinutes.CityDistricts);
            if (removeRes.records.length !== 0) {
                log("During the saving data from source to DB the old "
                    + "records was found and removed.");
                log(removeRes);
            }*/
            return transformedData;
        }
    }

}
