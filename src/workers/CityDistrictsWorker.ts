"use strict";

import CityDistrictsDataSource from "../datasources/CityDistrictsDataSource";
import CityDistrictsModel from "../models/CityDistrictsModel";
import CityDistrictsTransformation from "../transformations/CityDistrictsTransformation";
import BaseWorker from "./BaseWorker";

export default class CityDistrictsWorker extends BaseWorker {

    private model: CityDistrictsModel;
    private dataSource: CityDistrictsDataSource;
    private transformation: CityDistrictsTransformation;

    constructor() {
        super();
        this.model = new CityDistrictsModel();
        this.dataSource = new CityDistrictsDataSource();
        this.transformation = new CityDistrictsTransformation();
    }

    public refreshDataInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSource.GetAll();
        const transformedData = await this.transformation.TransformDataCollection(data);
        await this.model.SaveToDb(transformedData);
    }

}
