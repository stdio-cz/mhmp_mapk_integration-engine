"use strict";

import { CityDistricts } from "data-platform-schema-definitions";
import DataSource from "../datasources/DataSource";
import HTTPProtocolStrategy from "../datasources/HTTPProtocolStrategy";
import JSONDataTypeStrategy from "../datasources/JSONDataTypeStrategy";
import Validator from "../helpers/Validator";
import CityDistrictsModel from "../models/CityDistrictsModel";
import CityDistrictsTransformation from "../transformations/CityDistrictsTransformation";
import BaseWorker from "./BaseWorker";

const config = require("../config/ConfigLoader");

export default class CityDistrictsWorker extends BaseWorker {

    private model: CityDistrictsModel;
    private dataSource: DataSource;
    private transformation: CityDistrictsTransformation;

    constructor() {
        super();
        this.dataSource = new DataSource(CityDistricts.name + "DataSource",
            new HTTPProtocolStrategy({
                headers : {},
                method: "GET",
                url: config.datasources.CityDistricts,
            }),
            new JSONDataTypeStrategy({resultsPath: "features"}),
            new Validator(CityDistricts.name + "DataSource", CityDistricts.datasourceMongooseSchemaObject));
        this.model = new CityDistrictsModel();
        this.transformation = new CityDistrictsTransformation();
    }

    public refreshDataInDB = async (msg: any): Promise<void> => {
        const data = await this.dataSource.getAll();
        const transformedData = await this.transformation.TransformDataCollection(data);
        await this.model.SaveToDb(transformedData);
    }

}
