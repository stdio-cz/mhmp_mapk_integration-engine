"use strict";

import MerakiAccessPointsObservationsModel from "../models/MerakiAccessPointsObservationsModel";
import MerakiAccessPointsTagsModel from "../models/MerakiAccessPointsTagsModel";
import MerakiAccessPointsTransformation from "../transformations/MerakiAccessPointsTransformation";

export default class MerakiAccessPointsWorker {

    private modelObservations: MerakiAccessPointsObservationsModel;
    private modelTags: MerakiAccessPointsTagsModel;
    private transformation: MerakiAccessPointsTransformation;

    constructor() {
        this.modelObservations = new MerakiAccessPointsObservationsModel();
        this.modelTags = new MerakiAccessPointsTagsModel();
        this.transformation = new MerakiAccessPointsTransformation();
    }

    public saveDataToDB = async (inputData): Promise<any> => {
        const transformedData = await this.transformation.TransformDataCollection(inputData);
        await this.modelObservations.SaveToDb(transformedData.observations);
        await this.modelTags.SaveToDb(transformedData.tags);
        return transformedData;
    }

}
