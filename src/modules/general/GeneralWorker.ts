"use strict";

import { IncomingHttpHeaders } from "http";
import { Validator } from "../../core/helpers";
import { MongoModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";

export class GeneralWorker extends BaseWorker {

    private model: MongoModel;

    constructor() {
        super();
    }

    public saveData = async (msg: any): Promise<void> => {
        const inputData: {
            providerName: string,
            headers: IncomingHttpHeaders,
            body: any,
        } = JSON.parse(msg.content.toString());

        const schema = {
            data: { type: String, required: true },
            headers: { type: String, required: true },
        };
        this.model = new MongoModel(inputData.providerName + "Model", {
            identifierPath: "id",
            mongoCollectionName: inputData.providerName,
            outputMongooseSchemaObject: schema,
            savingType: "insertOnly",
        },
            new Validator(inputData.providerName + "ModelValidator", schema),
        );

        await this.model.save({
            data: JSON.stringify(inputData.body),
            headers: JSON.stringify(inputData.headers),
        });
    }
}
