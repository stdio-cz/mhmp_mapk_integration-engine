"use strict";

import { MunicipalAuthorities } from "data-platform-schema-definitions";
import BaseTransformation from "./BaseTransformation";
import ITransformation from "./ITransformation";

const config = require("../config/ConfigLoader");

export default class MunicipalAuthoritiesTransformation extends BaseTransformation implements ITransformation {

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
                address: (element.address) ? element.address : null,
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
                timestamp: new Date().getTime(),
                type: (element.type) ? element.type : null,
                web: (element.web) ? element.web : [],
            },
            type: "Feature",
        };

        if (element.opening_hours_monday) {
            res.properties.opening_hours.push({
                day: "Pondělí",
                hours: element.opening_hours_monday.split("; "),
            });
        }
        if (element.opening_hours_tuesday) {
            res.properties.opening_hours.push({
                day: "Úterý",
                hours: element.opening_hours_tuesday.split("; "),
            });
        }
        if (element.opening_hours_wednesday) {
            res.properties.opening_hours.push({
                day: "Středa",
                hours: element.opening_hours_wednesday.split("; "),
            });
        }
        if (element.opening_hours_thursday) {
            res.properties.opening_hours.push({
                day: "Čtvrtek",
                hours: element.opening_hours_thursday.split("; "),
            });
        }
        if (element.opening_hours_friday) {
            res.properties.opening_hours.push({
                day: "Pátek",
                hours: element.opening_hours_friday.split("; "),
            });
        }
        if (element.opening_hours_saturday) {
            res.properties.opening_hours.push({
                day: "Sobota",
                hours: element.opening_hours_saturday.split("; "),
            });
        }
        if (element.opening_hours_sunday) {
            res.properties.opening_hours.push({
                day: "Neděle",
                hours: element.opening_hours_sunday.split("; "),
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

}
