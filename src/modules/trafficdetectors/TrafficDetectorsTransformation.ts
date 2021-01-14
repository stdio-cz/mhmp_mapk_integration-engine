"use strict";

import { TSKSTD } from "@golemio/schema-definitions";
import * as moment from "moment-timezone";
import { BaseTransformation, ITransformation } from "../../core/transformations";

import xml2js = require("xml2js-es6-promise");

export class TrafficDetectorsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    // to config ?
    private allowedDetectors = {
        CollectR: {
            classMap: { // input: output
                all: 1,
                1: 2,
                2: 3,
            },
        },
    };

    private xmlEntities = {
        "&#xD;": "",
        "&amp;": "&",
        "&apos;": "\\",
        "&gt;": ">",
        "&lt;": "<",
        "&quot;": '"',
      };

      constructor() {
        super();
        this.name = TSKSTD.name;
    }

    /**
     * Overrides BaseTransformation::transform
     */
    public transform = async (data: any | any[]): Promise<any | any[]> => {
        const result = {
            data: [],
            errors: [],
            token: null,
        };

        let filteredData = null;

        try {
            data = (await xml2js(
                this.unescape(
                    data["s:Envelope"]["s:Body"]?.GetOnlineDataResponse?.GetOnlineDataResult || [],
                    ),
                    {
                        explicitArray: false,
                        trim: true,
                    },
                )
            )?.msg || [];
        } catch (err) {
            throw new Error("Wrong data recieved - not able to parse");
        }

        result.token = data?.$?.token;

        if (data?.detector instanceof Array) {
            filteredData = data.detector.filter((element: any) => {
                return (!!this.allowedDetectors[element.$.type]);
            });

            for (const element of filteredData) {
                const transformed = await this.transformElement(element);

                result.data = [...result.data, ...transformed.data];
                result.errors = [...result.errors, ...transformed.errors];
            }

            return result;
        } else {
            throw new Error(`Wrong data recieved - expected \`Array\`, got \`${typeof data}\``);
        }
    }

    protected transformElement = async (element: any) => {
        const res = {
            data: [],
            errors: [],
        };

        if (element.$ && element.start && element.stop) {
            // tslint:disable: variable-name
            const partRes = {
                detector_id: element.$.id,
                // tsk is reporting zulu time which is +2 in fact (= local prg time)
                measured_from: moment(element.start._.replace("Z", "")).tz("Europe/Prague", true).valueOf(),
                measured_to: moment(element.stop._.replace("Z", "")).tz("Europe/Prague", true).valueOf(),
            };

            ["count", "speed", "occupancy"].forEach((measurement_type) => {
                if (element[measurement_type]) {
                    res.data.push({
                        class_id: this.allowedDetectors[element.$.type].classMap.all,
                        measurement_type,
                        value: element[measurement_type].all,
                        ...partRes,
                    });
                    (element[measurement_type]?.class || []).forEach((data: any) => {
                        res.data.push({
                            class_id: this.allowedDetectors[element.$.type].classMap[data.$.id] || 0,
                            measurement_type,
                            value: data._,
                            ...partRes,
                        });
                    });

                }
            });
        } else if (element?.error_list?.error) {
            const datetime = moment(element.datetime._.replace("Z", "")).tz("Europe/Prague", true);
            const partRes = {
                detector_id: element.$.id,
                measured_at: datetime.valueOf(),
                measured_at_iso: datetime.toISOString(),
            };
            (element?.error_list?.error || []).forEach((error: any) => {
                res.errors.push({
                    error_desc: error?.$?.description || "NA",
                    error_id: error?.$?.id || 0,
                    ...partRes,
                });
            });

        }
        return res;
    }

    // unEscapes text for XML.
    private unescape = (value: string) => {
        return value.replace(/&amp;|&lt;|&gt;|&#xD;/g, (entity) => {
            return this.xmlEntities[entity];
        });
    }
}
