
import { config } from "../../core/config";

import { BaseWorker } from "../../core/workers";

import { CustomError } from "@golemio/errors";
import { Flow } from "@golemio/schema-definitions";
import { DataSourceStream } from "../../core/datasources/DataSourceStream";
import { PostgresModel } from "../../core/models";

import axios, { Method } from "axios";
import * as https from "https";
import * as JSONStream from "JSONStream";
import * as moment from "moment";

import {
    DataSourceStreamed,
    HTTPProtocolStrategyStreamed,
    IHTTPSettings,
} from "../../core/datasources";

export class FlowWorker extends BaseWorker {

    private cubesDataSource: DataSourceStreamed;
    private analyticsDataSource: DataSourceStreamed;
    private sinksDataSource: DataSourceStreamed;
    private sinksHistoryDataSource: DataSourceStreamed;

    private flowMeasurementModel: PostgresModel;

    private queuePrefix: string = `${config.RABBIT_EXCHANGE_NAME}.flow`;

    constructor() {
        super();

        this.flowMeasurementModel = new PostgresModel(
            Flow.detections.name + "Model",
            {
                outputSequelizeAttributes: Flow.detections.outputSequelizeAttributes,
                pgTableName: Flow.detections.pgTableName,
                savingType: "insertOrUpdate",
            },
            null,
        );

        this.cubesDataSource = new DataSourceStreamed(
            "cubes" + "DataSource",
            new HTTPProtocolStrategyStreamed({
                headers: {},
                method: "GET",
                url: config.datasources.FlowAPI,
            }).setStreamTransformer(JSONStream.parse("cubes.*")),
            null,
            null,
        );

        this.analyticsDataSource = new DataSourceStreamed(
            "analytics" + "DataSource",
            new HTTPProtocolStrategyStreamed({
                headers: {},
                method: "GET",
                url: config.datasources.FlowAPI,
            }).setStreamTransformer(JSONStream.parse("analytics.*")),
            null,
            null,
        );

        this.sinksDataSource = new DataSourceStreamed(
            "sinks" + "DataSource",
            new HTTPProtocolStrategyStreamed({
                headers: {},
                method: "GET",
                url: config.datasources.FlowAPI,
            }).setStreamTransformer(JSONStream.parse("sinks.*")),
            null,
            null,
        );

        this.sinksHistoryDataSource = new DataSourceStreamed(
            "sinksHistory" + "DataSource",
            new HTTPProtocolStrategyStreamed({
                headers: {},
                method: "POST",
                url: config.datasources.FlowAPI,
            }).setStreamTransformer(JSONStream.parse("sinks.*")),
            null,
            null,
        );
    }

    public refreshCubes = async (msg: any): Promise<void> => {
        let dataStream: DataSourceStream;

        try {
            this.cubesDataSource.protocolStrategy.setConnectionSettings(this.getHttpSettings(
                "",
                "GET",
                null,
            ));
            dataStream = (await this.cubesDataSource.getAll(true));
        } catch (err) {
            throw new CustomError("Error while getting data.", true, this.constructor.name, 5050, err);
        }

        try {
            await dataStream.setDataProcessor(async (data: any) => {
                const promises = data.map((cube: any) => {
                    this.sendMessageToExchange(
                        "workers." + this.queuePrefix + ".getAnalytics",
                        JSON.stringify(cube),
                        );
                });
                await Promise.all(promises);
            }).proceed();
        } catch (err) {
            throw new CustomError("Error while processing data.", true, this.constructor.name, 5050, err);
        }
    }

    public getAnalytics = async (msg: any): Promise<void> => {
        let input: any;
        let dataStream: DataSourceStream;

        try {
            input = JSON.parse(msg.content.toString());

            if (input?.id === undefined ) {
                throw new Error(`Can not process getAnalytics input: ${input}`);
            }

            this.analyticsDataSource.protocolStrategy.setConnectionSettings(this.getHttpSettings(
                `/${input.id}/analytics`,
                "GET",
                null,
            ));
            dataStream = (await this.analyticsDataSource.getAll(true));
        } catch (err) {
            throw new CustomError("Error while getting data.", true, this.constructor.name, 5050, err);
        }

        try {
            await dataStream.setDataProcessor(async (data: any) => {
                const httpsAgent = new https.Agent({
                    rejectUnauthorized: false,
                });

                const axPromises = data.map((analytic: any) => {
                    // no need for DataSource
                    return axios.request({
                        headers: {
                            "Accept-Version": "1.3",
                            "Authorization": `Bearer ${config.datasources.FlowAPI.token}`,
                            "Content-Type": "application/json",
                        },
                        httpsAgent,
                        method: "GET",
                        url: `${config.datasources.FlowAPI.url}/${input.id}/analytics/${analytic.id}`,
                    });

                });

                const analytics = await Promise.all(axPromises);

                const exPromises = analytics.map((analytic: any) => {
                    this.sendMessageToExchange(
                        "workers." + this.queuePrefix + ".getSinks",
                        JSON.stringify({
                            analytic: analytic.data,
                            cube: input,
                        }),
                    );
                });
                await Promise.all(exPromises);
            }).proceed();
        } catch (err) {
            throw new CustomError("Error while processing data.", true, this.constructor.name, 5050, err);
        }
    }

    public getSinks = async (msg: any): Promise<void> => {
        let input: any;
        let dataStream: DataSourceStream;

        try {
            input = JSON.parse(msg.content.toString());

            if (
                input?.analytic?.id === undefined ||
                input?.cube?.id === undefined
            ) {
                throw new Error(`Can not process getAnalytics input: ${JSON.stringify(input)}`);
            }

            this.sinksDataSource.protocolStrategy.setConnectionSettings(this.getHttpSettings(
                `/api/cubes/${input?.cube?.id}/analytics/${input?.analytic?.id}/sinks`,
                "GET",
                null,
            ));
            dataStream = (await this.sinksDataSource.getAll(true));
        } catch (err) {
            throw new CustomError("Error while getting data.", true, this.constructor.name, 5050, err);
        }

        try {
            await dataStream.setDataProcessor(async (data: any) => {

                data = data.filter((sink: any) => {
                    return sink?.output_value_type === "distribution";
                });

                this.sendMessageToExchange(
                    "workers." + this.queuePrefix + ".getSinksHistoryPayloads",
                    JSON.stringify({
                        analytic: input.analytic,
                        cube: input.cube,
                        sinks: data,
                    }),
                );

            }).proceed();
        } catch (err) {
            throw new CustomError("Error while processing data.", true, this.constructor.name, 5050, err);
        }
    }

    public getSinksHistoryPayloads = async (msg: any): Promise<void> => {
        let input: any;

        try {
            input = JSON.parse(msg.content.toString());

            if (
                input?.analytic?.id === undefined ||
                input?.cube?.id === undefined ||
                !input.sinks
            ) {
                throw new Error(`Can not process getAnalytics input: ${JSON.stringify(input)}`);
            }

            const now = (new Date()).getTime();
            // const payloads = this.getHistoryPayload(this.getTimeRanges(), input);

            await Promise.all(
                this.getHistoryPayload([[now -  60 * 60 * 1000, now]], input).map((payload) => {
                    this.sendMessageToExchange(
                        "workers." + this.queuePrefix + ".getSinksHistory",
                        JSON.stringify({
                            analytic: input.analytic,
                            cube: input.cube,
                            payload,
                        }),
                    );
                }),
            );
        } catch (err) {
            throw new CustomError("Error while getting data.", true, this.constructor.name, 5050, err);
        }
    }

    public getSinksHistory = async (msg: any): Promise<void> => {
        let dataStream: DataSourceStream;
        let input: any;

        try {
            input = JSON.parse(msg.content.toString());

            if (
                input?.analytic?.id === undefined ||
                input?.cube?.id === undefined ||
                !input.payload
            ) {
                throw new Error(`Can not process getAnalytics input: ${JSON.stringify(input)}`);
            }

            this.sinksHistoryDataSource.protocolStrategy.setConnectionSettings(
                this.getHttpSettings(
                    `/api/cubes/${input?.cube?.id}/analytics/${input?.analytic?.id}/sinks/history`,
                    "POST",
                    input.payload,
                ),
            );

            dataStream = (await this.sinksHistoryDataSource.getAll(true));
        } catch (err) {
            throw new CustomError("Error while getting data.", true, this.constructor.name, 5050, err);
        }

        try {
            await dataStream.setDataProcessor(async (data: any) => {
                const detections = this.getMeasurements(
                    data,
                    input.cube.id,
                    input.payload.sequence_number,
                    input.analytic.id,
                );

                // does not work for some reason ...
                // await this.flowMeasurementModel.saveBySqlFunction(
                //     detections,
                //     [ "sink_id", "start_timestamp", "end_timestamp", "category", "sequence_number" ],
                // );
                await this.flowMeasurementModel.save(
                    detections,
                );
            }).proceed();
        } catch (err) {
            throw new CustomError("Error while processing data.", true, this.constructor.name, 5050, err);
        }
    }

    // tslint:disable-next-line: variable-name
    private getMeasurements = (data: any, cube_id: any, sequence_number: any, analytic_id: any): any => {
        const measurementsNormalised = [];

        data.forEach((element: any) => {
            (element?.snapshots || []).forEach((meassutements: any) => {
                (meassutements?.data?.categories || []).forEach((meassutement: any) => {
                    // filter out 'old' format
                    const startTimestamp = parseInt(meassutements.data_start_timestamp, 10);
                    if (startTimestamp && !isNaN(startTimestamp)) {
                        measurementsNormalised.push({
                            sink_id: element.id,
                            // tslint:disable-next-line: object-literal-sort-keys
                            cube_id,
                            sequence_number,
                            analytic_id,
                            start_timestamp: meassutements.data_start_timestamp,
                            end_timestamp: meassutements.data_end_timestamp,
                            category: meassutement.category,
                            value: meassutement.count,
                        });
                    }
                });
            });
        });
        return measurementsNormalised;
    }

    private getHistoryPayload(timeRanges: any[], data: any): any {
        const payloads = [];

        timeRanges.forEach((range: number[]) => {
            const payload = {
                sequence_number: data.analytic.sequence_number,
                sinks: [],
            };
            data.sinks.forEach((sink: any) => {
                payload.sinks.push({
                    // has to be string!
                    end_timestamp: `${range[1]}`,
                    id: sink.id,
                    // has to be string!
                    start_timestamp: `${range[0]}`,
                });
            });
            payloads.push(payload);
        });
        return payloads;
    }

    // not used for now - leaving it here just for case they screw up API
    // get array of all pastOffset to past timeranges [startTS, endTS]
    // where endTS - startTS === interval starting now - pastOffset
    private getTimeRanges = (
        start: moment.Moment = null,
        pastOffset: number = 60,
        interval: number = 5,
    ): any[] => {
        if (!start) {
            start = moment();
        }
        const fullMinsDiv = start.second(0).millisecond(0).minutes() % interval;

        const startTs = parseInt(
        start
            .second(0)
            .millisecond(0)
            .subtract(fullMinsDiv, "minutes")
            .format("x"),
        10);

        const endTs = parseInt(
        start
            .subtract(pastOffset, "minutes")
            .format("x"),
        10);

        const ranges = [];

        let currentTs = startTs;
        const intervalMs = interval * 60 * 1000;

        while (currentTs - intervalMs > endTs) {
            ranges.push([currentTs - intervalMs, currentTs]);
            currentTs = currentTs - intervalMs;
        }

        return ranges;

    }

    private getHttpSettings = (
        sufix: string = "",
        method: string | Method = "GET",
        body: any = null,
    ): IHTTPSettings => {
        const settings: any = {
            headers: {
                "Accept-Version": "1.3",
                "Authorization": `Bearer ${config.datasources.FlowAPI.token}`,
                "Content-Type": "application/json",
            },
            method,
            rejectUnauthorized: false,
            url: `${config.datasources.FlowAPI.url}${sufix}`,
        };

        if (body) {
            settings.body = JSON.stringify(body);
        }

        return settings;
    }
}
