"use strict";

import { MerakiAccessPoints } from "data-platform-schema-definitions";
import PostgresModel from "../models/PostgresModel";
import MerakiAccessPointsTransformation from "../transformations/MerakiAccessPointsTransformation";
import BaseWorker from "./BaseWorker";

export default class MerakiAccessPointsWorker extends BaseWorker {

    private modelObservations: PostgresModel;
    private modelTags: PostgresModel;
    private transformation: MerakiAccessPointsTransformation;

    constructor() {
        super();
        this.modelObservations = new PostgresModel(MerakiAccessPoints.observations.name + "Model", {
                outputSequelizeAttributes: MerakiAccessPoints.observations.outputSequelizeAttributes,
                pgTableName: MerakiAccessPoints.observations.pgTableName,
                savingType: "insertOnly",
            },
            null,
        );
        this.modelTags = new PostgresModel(MerakiAccessPoints.tags.name + "Model", {
                outputSequelizeAttributes: MerakiAccessPoints.tags.outputSequelizeAttributes,
                pgTableName: MerakiAccessPoints.tags.pgTableName,
                savingType: "insertOrUpdate",
            },
            null,
        );
        this.transformation = new MerakiAccessPointsTransformation();
    }

    public saveDataToDB = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const transformedData = await this.transformation.transform(inputData);
        await this.modelObservations.save(transformedData.observations);
        await this.modelTags.save(transformedData.tags);
    }

}
