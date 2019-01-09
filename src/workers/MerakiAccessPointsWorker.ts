"use strict";

import MerakiAccessPointsObservationsModel from "../models/MerakiAccessPointsObservationsModel";
import MerakiAccessPointsTagsModel from "../models/MerakiAccessPointsTagsModel";
import MerakiAccessPointsTransformation from "../transformations/MerakiAccessPointsTransformation";
import BaseWorker from "./BaseWorker";

export default class MerakiAccessPointsWorker extends BaseWorker {

    private modelObservations: MerakiAccessPointsObservationsModel;
    private modelTags: MerakiAccessPointsTagsModel;
    private transformation: MerakiAccessPointsTransformation;

    constructor() {
        super();
        this.modelObservations = new MerakiAccessPointsObservationsModel();
        this.modelTags = new MerakiAccessPointsTagsModel();
        this.transformation = new MerakiAccessPointsTransformation();
    }

    public saveDataToDB = async (inputData: any): Promise<void> => {
        const transformedData = await this.transformation.TransformDataCollection(inputData);
        await this.modelObservations.SaveToDb(transformedData.observations);
        await this.modelTags.SaveToDb(transformedData.tags);
    }

}
