"use strict";

import { MOS } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import * as JSONStream from "JSONStream";
import { Readable } from "stream";
import { config } from "../../core/config";
import { PostgresModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import {
    MosMADeviceModelsTransformation,
    MosMATicketActivationsTransformation,
    MosMATicketInspectionsTransformation,
    MosMATicketPurchasesTransformation,
} from "./";

export class MosMAWorker extends BaseWorker {

    private deviceModelModel: PostgresModel;
    private ticketActivationsModel: PostgresModel;
    private ticketInspectionsModel: PostgresModel;
    private ticketPurchasesModel: PostgresModel;
    private deviceModelTransformation: MosMADeviceModelsTransformation;
    private ticketActivationsTransformation: MosMATicketActivationsTransformation;
    private ticketInspectionsTransformation: MosMATicketInspectionsTransformation;
    private ticketPurchasesTransformation: MosMATicketPurchasesTransformation;
    private queuePrefix: string;

    constructor() {
        super();
        this.deviceModelModel = new PostgresModel(MOS.MA.deviceModels.name + "Model", {
            outputSequelizeAttributes: MOS.MA.deviceModels.outputSequelizeAttributes,
            pgTableName: MOS.MA.deviceModels.pgTableName,
            savingType: "insertOnly",
        },
            new Validator(MOS.MA.deviceModels.name + "ModelValidator",
                MOS.MA.deviceModels.outputMongooseSchemaObject),
        );
        this.ticketActivationsModel = new PostgresModel(MOS.MA.ticketActivations.name + "Model", {
            outputSequelizeAttributes: MOS.MA.ticketActivations.outputSequelizeAttributes,
            pgTableName: MOS.MA.ticketActivations.pgTableName,
            savingType: "insertOrUpdate",
        },
            new Validator(MOS.MA.ticketActivations.name + "ModelValidator",
                MOS.MA.ticketActivations.outputMongooseSchemaObject),
        );
        this.ticketInspectionsModel = new PostgresModel(MOS.MA.ticketInspections.name + "Model", {
            outputSequelizeAttributes: MOS.MA.ticketInspections.outputSequelizeAttributes,
            pgTableName: MOS.MA.ticketInspections.pgTableName,
            savingType: "insertOnly",
        },
            new Validator(MOS.MA.ticketInspections.name + "ModelValidator",
                MOS.MA.ticketInspections.outputMongooseSchemaObject),
        );
        this.ticketPurchasesModel = new PostgresModel(MOS.MA.ticketPurchases.name + "Model", {
            outputSequelizeAttributes: MOS.MA.ticketPurchases.outputSequelizeAttributes,
            pgTableName: MOS.MA.ticketPurchases.pgTableName,
            savingType: "insertOrUpdate",
        },
            new Validator(MOS.MA.ticketPurchases.name + "ModelValidator",
                MOS.MA.ticketPurchases.outputMongooseSchemaObject),
        );
        this.deviceModelTransformation = new MosMADeviceModelsTransformation();
        this.ticketActivationsTransformation = new MosMATicketActivationsTransformation();
        this.ticketInspectionsTransformation = new MosMATicketInspectionsTransformation();
        this.ticketPurchasesTransformation = new MosMATicketPurchasesTransformation();
        this.queuePrefix = config.RABBIT_EXCHANGE_NAME + "." + MOS.MA.name.toLowerCase();
    }

    public saveDeviceModelsDataToDB = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const transformedData = await this.deviceModelTransformation.transform(inputData);
        await this.deviceModelModel.truncate();
        await this.deviceModelModel.save(transformedData);
    }

    public saveTicketActivationsDataToDB = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const transformedData = await this.ticketActivationsTransformation.transform(inputData);
        await this.ticketActivationsModel.saveBySqlFunction(transformedData, [ "ticket_id" ]);
    }

    public saveTicketInspectionsDataToDB = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const transformedData = await this.ticketInspectionsTransformation.transform(inputData);
        await this.ticketInspectionsModel.save(transformedData);
    }

    public saveTicketPurchasesDataToDB = async (msg: any): Promise<void> => {
        const inputData = JSON.parse(msg.content.toString());
        const transformedData = await this.ticketPurchasesTransformation.transform(inputData);
        await this.ticketPurchasesModel.saveBySqlFunction(transformedData, [ "ticket_id" ]);
    }

    public transformAndSaveChunkedData = async (msg: any): Promise<void> => {
        const input = JSON.parse(msg.content.toString());
        const inputData = input.data;
        const transformMethod = input.transformMethod;
        const saveMethod = input.saveMethod;
        const transformedData = await this[transformMethod].transform(inputData);
        await this[saveMethod].save(transformedData);
    }

    private parseBigJsonAndSend = (bigJson: Buffer, transformMethod: string, saveMethod: string): Promise<any> => {
        return new Promise<any>((resolve, reject) => {
            const readable = new Readable();
            let output = [];
            const chunks = [];

            readable._read = () => {
                // _read is required but you can noop it
            };
            readable.push(bigJson);
            readable.push(null);

            readable
                .pipe(JSONStream.parse("*"))
                .on("data", (d: any) => {
                    output.push(d);
                    if (output.length % 1000 === 0) {
                        chunks.push(output);
                        output = [];
                    }
                })
                .on("error", (err: any) => {
                    return reject(err);
                })
                .on("end", () => {
                    if (output.length > 0) {
                        chunks.push(output);
                    }
                    return Promise.all(chunks.map(async (chunk) => {
                        await this.sendMessageToExchange("workers." + this.queuePrefix + ".transformAndSaveChunkedData",
                            JSON.stringify({
                                data: chunk,
                                saveMethod,
                                transformMethod,
                            }));
                        }))
                        .then(() => resolve())
                        .catch((err) => reject(err));
                });
        });
    }

}
