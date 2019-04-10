"use strict";

import { MerakiAccessPoints } from "golemio-schema-definitions";
import { Validator } from "../../core/helpers";
import { PostgresModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { MerakiAccessPointsTransformation } from "./";

export class MerakiAccessPointsWorker extends BaseWorker {

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
            new Validator(MerakiAccessPoints.observations.name + "ModelValidator",
                MerakiAccessPoints.observations.outputMongooseSchemaObject),
        );
        this.modelTags = new PostgresModel(MerakiAccessPoints.tags.name + "Model", {
                outputSequelizeAttributes: MerakiAccessPoints.tags.outputSequelizeAttributes,
                pgTableName: MerakiAccessPoints.tags.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(MerakiAccessPoints.tags.name + "ModelValidator",
                MerakiAccessPoints.tags.outputMongooseSchemaObject),
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
