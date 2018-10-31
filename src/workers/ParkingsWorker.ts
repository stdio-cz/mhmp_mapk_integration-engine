"use strict";

import TSKParkingsDataSource from "../datasources/TSKParkingsDataSource";
import CustomError from "../helpers/errors/CustomError";
import GeocodeApi from "../helpers/GeocodeApi";
import CityDistrictsModel from "../models/CityDistrictsModel";
import ParkingsHistModel from "../models/ParkingsHistModel";
import ParkingsModel from "../models/ParkingsModel";
import ParkingsHistPipeline from "../pipelines/ParkingsHistPipeline";
import ParkingsPipeline from "../pipelines/ParkingsPipeline";

const configHelper = require("../helpers/ConfigHelper")("refreshtimes");
const log = require("debug")("data-platform:integration-engine");

export default class ParkingsWorker {

    private parkingsModel: ParkingsModel;
    private parkingsDataSource: TSKParkingsDataSource;
    private parkingsPipeline: ParkingsPipeline;
    private parkingsHistModel: ParkingsHistModel;
    private parkingsHistPipeline: ParkingsHistPipeline;

    constructor() {
        this.parkingsModel = new ParkingsModel();
        this.parkingsDataSource = new TSKParkingsDataSource();
        this.parkingsPipeline = new ParkingsPipeline();
        this.parkingsHistModel = new ParkingsHistModel();
        this.parkingsHistPipeline = new ParkingsHistPipeline();
    }

    public refreshDataInDB = async (): Promise<any> => {
        const data = await this.parkingsDataSource.GetAll();
        const transformedData = await this.parkingsPipeline.TransformDataCollection(data);
        const isValid = await this.parkingsModel.Validate(transformedData);
        if (!isValid) {
            throw new CustomError("Transformed data are not valid.", true, 1011);
        } else {
            await this.parkingsModel.SaveToDb(transformedData);
            const removeRes =
                await this.parkingsModel.RemoveOldRecords(configHelper.getVar("Parkings"));
            if (removeRes.records.length !== 0) {
                log("During the saving data from source to DB the old "
                    + "records was found and removed.");
                log(removeRes);
            }
            return transformedData;
        }
    }

    public saveDataToHistory = async (data: any): Promise<any> => {
        const transformedData = await this.parkingsHistPipeline.TransformDataCollection(data);
        const isValid = await this.parkingsHistModel.Validate(transformedData);
        if (!isValid) {
            throw new CustomError("Transformed data are not valid.", true, 1011);
        } else {
            const savingResult = await this.parkingsHistModel.SaveToDb(transformedData);
            return transformedData;
        }
    }

    public updateAddressAndDistrict = async (data: any): Promise<any> => {
        const id = data.properties.id;
        const dbData = await this.parkingsModel.GetOneFromModel(id);

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
