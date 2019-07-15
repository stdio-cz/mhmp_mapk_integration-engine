"use strict";

import { GeneralImport } from "golemio-schema-definitions";
import { IncomingHttpHeaders } from "http";
import { SchemaDefinition } from "mongoose";
import { Validator } from "../../core/helpers";
import { MongoModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { GeneralTransformation } from "./GeneralTransformation";

export class GeneralWorker extends BaseWorker {

    private transformation: GeneralTransformation;
    private schema: SchemaDefinition;
    private model: MongoModel;

    constructor() {
        super();
        this.transformation = new GeneralTransformation();
        this.schema = GeneralImport.outputMongooseSchemaObject;
    }

    public saveData = async (msg: any): Promise<void> => {
        const inputData: {
            providerName: string,
            headers: IncomingHttpHeaders,
            body: object | string,
        } = JSON.parse(msg.content.toString());

        this.model = this.createModel(inputData.providerName);

        const data: object = await this.transformation.transform(inputData);

        await this.model.save(data);
    }

    public createModel(providerName: string): MongoModel {
        return new MongoModel(providerName + "Model", {
            identifierPath: "id",
            mongoCollectionName: GeneralImport.name.toLocaleLowerCase() + "_" + providerName,
            outputMongooseSchemaObject: this.schema,
            savingType: "insertOnly",
        },
            new Validator(providerName + "ModelValidator", this.schema),
        );
    }
}
