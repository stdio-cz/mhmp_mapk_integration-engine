import { CustomError } from "@golemio/errors";
import { TSKSTD } from "@golemio/schema-definitions";
import { Validator } from "@golemio/validator";
import * as xmlStream from "xml-to-json-stream";
import { config } from "../../core/config";

import {
    DataSourceStream,
    DataSourceStreamed,
    HTTPProtocolStrategyStreamed,
    JSONDataTypeStrategy,
} from "../../core/datasources";

import { PostgresModel } from "../../core/models";
import { BaseWorker } from "../../core/workers";
import { TrafficDetectorsTransformation } from "./TrafficDetectorsTransformation";

import { v4 as uuidv4 } from "uuid";

import * as request from "request-promise";

import xml2js = require("xml2js-es6-promise");

export class TrafficDetectorsWorker extends BaseWorker {
    private dataSource: DataSourceStreamed;
    private dataStream: DataSourceStream;
    private measurementsModel: PostgresModel;
    private errorsModel: PostgresModel;
    private tskstdURL: string;
    private uuidv: string;
    private identifier: string = null;
    private transformation: TrafficDetectorsTransformation;

    constructor() {
        super();

        this.tskstdURL = config.datasources.TSKSTD.api_url;
        this.uuidv = uuidv4();

        const HTTPProtocolStrategy = new HTTPProtocolStrategyStreamed({
            headers: {},
            method: "",
            url: "",
        });

        this.dataSource = new DataSourceStreamed(TSKSTD.name + "DataSource",
            HTTPProtocolStrategy,
            new JSONDataTypeStrategy({
                resultsPath: "",
            }),
            null,
        );

        HTTPProtocolStrategy.setStreamTransformer(xmlStream().createStream());

        this.measurementsModel = new PostgresModel(
            TSKSTD.measurements.name + "Model",
            {
                attributesToRemove: ["id"],
                outputSequelizeAttributes: TSKSTD.measurements.outputSequelizeAttributes,
                pgTableName: TSKSTD.measurements.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(TSKSTD.measurements.name + "ModelValidator",
                TSKSTD.measurements.outputMongooseSchemaObject),
        );

        this.errorsModel = new PostgresModel(
            TSKSTD.errors.name + "Model",
            {
                attributesToRemove: ["id"],
                outputSequelizeAttributes: TSKSTD.errors.outputSequelizeAttributes,
                pgTableName: TSKSTD.errors.pgTableName,
                savingType: "insertOrUpdate",
            },
            new Validator(TSKSTD.errors.name + "ModelValidator",
                TSKSTD.errors.outputMongooseSchemaObject),
        );

        this.transformation = new TrafficDetectorsTransformation();
    }

    public saveNewTSKSTDDataInDB = async (msg: any): Promise<void> => {
        if (!this.identifier) {
            await this.setIdentifier();
        }
        // tslint:disable
        const getOnlineDataBody =
            "<s:Envelope xmlns:s=\"http://www.w3.org/2003/05/soap-envelope\" xmlns:r=\"http://schemas.xmlsoap.org/ws/2005/02/rm\" xmlns:a=\"http://www.w3.org/2005/08/addressing\">" +
            "<s:Header>" +
            "<r:Sequence s:mustUnderstand=\"1\">" +
            "<r:Identifier>" + this.identifier + "</r:Identifier>" +
            "<r:MessageNumber>1</r:MessageNumber>" +
            "</r:Sequence>" +
            "<a:Action s:mustUnderstand=\"1\">http://tempuri.org/IService/GetOnlineData</a:Action>" +
            "<a:MessageID>urn:uuid:" + this.uuidv + "</a:MessageID>" +
            "<a:ReplyTo>" +
            "<a:Address>http://www.w3.org/2005/08/addressing/anonymous</a:Address>" +
            "</a:ReplyTo>" +
            "<a:To s:mustUnderstand=\"1\">" + this.tskstdURL + "</a:To>" +
            "</s:Header>" +
            "<s:Body>" +

            "<GetOnlineData xmlns=\"http://tempuri.org/\">" +
            "<username>" + config.datasources.TSKSTD.user + "</username>" +
            "<password>" + config.datasources.TSKSTD.pass + "</password>" +
            "<token>" + "0" + "</token>" +
            "<source>CollectR</source>" +
            "</GetOnlineData>" +
            "</s:Body>" +
            "</s:Envelope>";
        // tslint:enable

        this.dataSource.protocolStrategy.setConnectionSettings({
            body: getOnlineDataBody,
            headers: {
                "Cache-Control": "no-cache",
                "Content-Type": "application/soap+xml",
            },
            method: "POST",
            strictSSL: false,
            timeout: 10000,
            url: this.tskstdURL,
        });

        // TO DO - move to hejper f - cion
        let processing = false;

        try {
            this.dataStream = (await this.dataSource.getAll(false));
        } catch (err) {
            throw new CustomError("Error while getting data.", true, this.constructor.name, 5050, err);
        }
        this.dataStream.onDataListeners.push(async (data: any) => {
            this.dataStream.pause();
            processing = true;
            let transformedData = null;

            try {
                transformedData = await this.transformation.transform(data);
            } catch (err) {
                this.dataStream.emit("error", err);
            }

            try {
                await this.measurementsModel.saveBySqlFunction(
                    transformedData.data,
                    ["detector_id", "measured_from", "measured_to", "measurement_type", "class_id"],
                    false,
                    null,
                    null,
                    transformedData.token,
                 );

                await this.errorsModel.saveBySqlFunction(
                    transformedData.errors,
                    ["detector_id", "error_id", "measured_at"],
                    false,
                    null,
                    null,
                    transformedData.token,
                );
            } catch (err) {
                this.dataStream.emit("error", err);
            }

            processing = false;
            this.dataStream.resume();
        });

        // attach data listeners => start processing data
        this.dataSource.proceed();

        try {
            // wait for stream to finish to report end
            await new Promise((resolve, reject) => {
                this.dataStream.on("error", (error) => reject(error));
                this.dataStream.on("end", async () => {
                    const checker = setInterval(async () => {
                        if (!processing) {
                            clearInterval(checker);
                            resolve();
                        }
                    }, 100);
                });
            });
        } catch (err) {
            throw new CustomError("Error processing data.", true, this.constructor.name, 5051, err);
        }
    }

    private setIdentifier = async (): Promise<void> => {
        // tslint:disable
        const options = {
            body:
                "<s:Envelope xmlns:s=\"http://www.w3.org/2003/05/soap-envelope\" xmlns:a=\"http://www.w3.org/2005/08/addressing\">" +
                "<s:Header>" +
                "<a:Action s:mustUnderstand=\"1\">http://schemas.xmlsoap.org/ws/2005/02/rm/CreateSequence</a:Action>" +
                "<a:MessageID>urn:uuid:" + this.uuidv + "</a:MessageID>" +
                "<a:To s:mustUnderstand=\"1\">" + this.tskstdURL + "</a:To>" +
                "</s:Header>" +
                "<s:Body>" +
                "<CreateSequence xmlns=\"http://schemas.xmlsoap.org/ws/2005/02/rm\">" +
                "<AcksTo>" +
                "<a:Address>http://www.w3.org/2005/08/addressing/anonymous</a:Address>" +
                "</AcksTo>" +
                "<Offer>" +
                "<Identifier>urn:uuid:" + this.uuidv + "</Identifier>" +
                "</Offer>" +
                "</CreateSequence>" +
                "</s:Body>" +
                "</s:Envelope>",
            headers: {
                "Cache-Control": "no-cache",
                "Content-Type": "application/soap+xml"
            },
            method: "POST",
            rejectUnauthorized: false,
            requestCert: true,
            timeout: 10000,
            url: this.tskstdURL,
            resolveWithFullResponse: true,
        };
        // tslint:enable

        const response = await request(options);
        const parsed = await xml2js(response.body);

        this.identifier = parsed["s:Envelope"]["s:Body"][0].CreateSequenceResponse[0].Identifier[0];

    }

}
