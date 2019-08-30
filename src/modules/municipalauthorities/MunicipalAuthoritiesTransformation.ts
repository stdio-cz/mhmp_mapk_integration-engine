"use strict";

import { MunicipalAuthorities } from "@golemio/schema-definitions";
import { config } from "../../core/config";
import { BaseTransformation, ITransformation } from "../../core/transformations";

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

        if (element.opening_hours_monday) {
            element.opening_hours_monday.split("; ").forEach((hours) => {
                const desc = hours.match(/\(([^)]+)\)/);
                hours.replace(/\(([^)]+)\)/, "").split(", ").forEach((h) => {
                    const [opens, closes] = h.split(" - ");
                    res.properties.opening_hours.push({
                        closes,
                        day_of_week: "Monday",
                        description: (desc && desc[1]) ? desc[1] : null,
                        opens,
                    });
                });
            });
        }
        if (element.opening_hours_tuesday) {
            element.opening_hours_tuesday.split("; ").forEach((hours) => {
                const desc = hours.match(/\(([^)]+)\)/);
                hours.replace(/\(([^)]+)\)/, "").split(", ").forEach((h) => {
                    const [opens, closes] = h.split(" - ");
                    res.properties.opening_hours.push({
                        closes,
                        day_of_week: "Tuesday",
                        description: (desc && desc[1]) ? desc[1] : null,
                        opens,
                    });
                });
            });
        }
        if (element.opening_hours_wednesday) {
            element.opening_hours_wednesday.split("; ").forEach((hours) => {
                const desc = hours.match(/\(([^)]+)\)/);
                hours.replace(/\(([^)]+)\)/, "").split(", ").forEach((h) => {
                    const [opens, closes] = h.split(" - ");
                    res.properties.opening_hours.push({
                        closes,
                        day_of_week: "Wednesday",
                        description: (desc && desc[1]) ? desc[1] : null,
                        opens,
                    });
                });
            });
        }
        if (element.opening_hours_thursday) {
            element.opening_hours_thursday.split("; ").forEach((hours) => {
                const desc = hours.match(/\(([^)]+)\)/);
                hours.replace(/\(([^)]+)\)/, "").split(", ").forEach((h) => {
                    const [opens, closes] = h.split(" - ");
                    res.properties.opening_hours.push({
                        closes,
                        day_of_week: "Thursday",
                        description: (desc && desc[1]) ? desc[1] : null,
                        opens,
                    });
                });
            });
        }
        if (element.opening_hours_friday) {
            element.opening_hours_friday.split("; ").forEach((hours) => {
                const desc = hours.match(/\(([^)]+)\)/);
                hours.replace(/\(([^)]+)\)/, "").split(", ").forEach((h) => {
                    const [opens, closes] = h.split(" - ");
                    res.properties.opening_hours.push({
                        closes,
                        day_of_week: "Friday",
                        description: (desc && desc[1]) ? desc[1] : null,
                        opens,
                    });
                });
            });
        }
        if (element.opening_hours_saturday) {
            element.opening_hours_saturday.split("; ").forEach((hours) => {
                const desc = hours.match(/\(([^)]+)\)/);
                hours.replace(/\(([^)]+)\)/, "").split(", ").forEach((h) => {
                    const [opens, closes] = h.split(" - ");
                    res.properties.opening_hours.push({
                        closes,
                        day_of_week: "Saturday",
                        description: (desc && desc[1]) ? desc[1] : null,
                        opens,
                    });
                });
            });
        }
        if (element.opening_hours_sunday) {
            element.opening_hours_sunday.split("; ").forEach((hours) => {
                const desc = hours.match(/\(([^)]+)\)/);
                hours.replace(/\(([^)]+)\)/, "").split(", ").forEach((h) => {
                    const [opens, closes] = h.split(" - ");
                    res.properties.opening_hours.push({
                        closes,
                        day_of_week: "Sunday",
                        description: (desc && desc[1]) ? desc[1] : null,
                        opens,
                    });
                });
            });
        }

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

}
