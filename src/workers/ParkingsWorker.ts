"use strict";

import TSKParkingsDataSource from "../datasources/TSKParkingsDataSource";
import CustomError from "../helpers/errors/CustomError";
import GeocodeApi from "../helpers/GeocodeApi";
import CityDistrictsModel from "../models/CityDistrictsModel";
import ParkingsHistoryModel from "../models/ParkingsHistoryModel";
import ParkingsModel from "../models/ParkingsModel";
import ParkingsHistoryTransformation from "../transformations/ParkingsHistoryTransformation";
import ParkingsTransformation from "../transformations/ParkingsTransformation";

export default class ParkingsWorker {

    private model: ParkingsModel;
    private dataSource: TSKParkingsDataSource;
    private pipeline: ParkingsTransformation;
    private historyModel: ParkingsHistoryModel;
    private historyTransformation: ParkingsHistoryTransformation;

    constructor() {
        this.model = new ParkingsModel();
        this.dataSource = new TSKParkingsDataSource();
        this.pipeline = new ParkingsTransformation();
        this.historyModel = new ParkingsHistoryModel();
        this.historyTransformation = new ParkingsHistoryTransformation();
    }

    public refreshDataInDB = async (): Promise<any> => {
        const data = await this.dataSource.GetAll();
        const transformedData = await this.pipeline.TransformDataCollection(data);
        await this.model.SaveToDb(transformedData);
        return transformedData;
    }

    public saveDataToHistory = async (data: any): Promise<any> => {
        const transformedData = await this.historyTransformation.TransformDataCollection(data);
        await this.historyModel.SaveToDb(transformedData);
        return transformedData;
    }

    public updateAddressAndDistrict = async (data: any): Promise<any> => {
        const id = data.properties.id;
        const dbData = await this.model.GetOneFromModel(id);

        if (!dbData.properties.district
            || data.geometry.coordinates[0] !== dbData.geometry.coordinates[0]
            || data.geometry.coordinates[1] !== dbData.geometry.coordinates[1]) {
            try {
                const cityDistricts = new CityDistrictsModel();
                const result = await cityDistricts.GetDistrictByCoordinations(dbData.geometry.coordinates);
                dbData.properties.district = result;
                await dbData.save();
            } catch (err) {
                throw new CustomError("Error while updating district.", true, 1015, err);
            }
        }

        if (!dbData.properties.address
            || data.geometry.coordinates[0] !== dbData.geometry.coordinates[0]
            || data.geometry.coordinates[1] !== dbData.geometry.coordinates[1]) {
            try {
                const address = await GeocodeApi.getAddressByLatLng(dbData.geometry.coordinates[1],
                    dbData.geometry.coordinates[0]);
                dbData.properties.address = address;
                await dbData.save();
            } catch (err) {
                throw new CustomError("Error while updating adress.", true, 1016, err);
            }
        }
        return dbData;
    }
}
