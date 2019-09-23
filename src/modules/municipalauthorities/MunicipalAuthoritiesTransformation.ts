"use strict";

import { MunicipalAuthorities } from "@golemio/schema-definitions";
import { config } from "../../core/config";
import { BaseTransformation, ITransformation } from "../../core/transformations";

enum openingHoursDaysKeys {
    opening_hours_monday = "Monday",
    opening_hours_tuesday = "Tuesday",
    opening_hours_wednesday = "Wednesday",
    opening_hours_thursday = "Thursday",
    opening_hours_friday = "Friday",
    opening_hours_saturday = "Saturday",
    opening_hours_sunday = "Sunday",
}

interface IOpeningHours {
    closes: string;
    description?: string | null;
    day_of_week: string;
    opens: string;
}

export class MunicipalAuthoritiesTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = MunicipalAuthorities.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            geometry: {
                coordinates: element.coordinates,
                type: "Point",
            },
            properties: {
                address: (element.address)
                    ? { address_formatted: element.address }
                    : null,
                agendas: [],
                district: (element.district) ? element.district : null,
                email: (element.email) ? element.email : [],
                id: element.slug,
                image: {
                    mimetype: (element.image && element.image.mimetype) ? element.image.mimetype : null,
                    size: (element.image && element.image.size) ? element.image.size : null,
                    url: (element.image && element.image.url)
                        ? config.MOJEPRAHA_ENDPOINT_BASEURL + element.image.url
                        : null,
                },
                name: element.name,
                official_board: (element.official_board) ? element.official_board : null,
                opening_hours: [],
                telephone: (element.telephone) ? element.telephone : [],
                type: (element.type)
                    ? { id: element.type, description: this.getTypeDescription(element.type) }
                    : null,
                updated_at: new Date().getTime(),
                web: (element.web) ? element.web : [],
            },
            type: "Feature",
        };

        Object.keys(openingHoursDaysKeys).map((openingHoursDaysKey: string) => {
            if (element[openingHoursDaysKey] && element[openingHoursDaysKey] !== "") {
                res.properties.opening_hours = [
                    ...res.properties.opening_hours,
                    ...this.transformOpeningHours(openingHoursDaysKeys[openingHoursDaysKey],
                        element[openingHoursDaysKey]),
                ];
            }
        });

        if (element.agendas && element.agendas.length > 0) {
            const agendas = element.agendas.map(async (agenda) => {
                const newAgenda = {
                    description: agenda.description,
                    keywords: agenda.keywords ? agenda.keywords : [],
                    long_description: (agenda.long_description)
                        ? agenda.long_description
                        : null,
                };
                if (!newAgenda.long_description) {
                    delete newAgenda.long_description;
                }
                return newAgenda;
            });
            res.properties.agendas = await Promise.all(agendas);
        }

        return res;
    }

    private getTypeDescription = (id: string): string => {
        switch (id) {
            case "city-hall": return "Magistrát";
            case "municipality": return "Obecní úřad";
            default: return "";
        }
    }

    private transformOpeningHours(dayString: string, openingHoursString: string): IOpeningHours[] {
        const res: IOpeningHours[] = [];
        openingHoursString.split("; ").forEach((hoursByScope: string) => {
            const desc = hoursByScope.match(/\(([^)]+)\)/);
            hoursByScope.replace(/\(([^)]+)\)/, "").split(", ").forEach((hours: string) => {
                const [opens, closes]: string[] = hours.split(" - ");
                res.push({
                    closes: closes.trim(),
                    day_of_week: dayString,
                    description: (desc && desc[1]) ? desc[1] : null,
                    opens: opens.trim(),
                });
            });
        });
        return res;
    }

}
