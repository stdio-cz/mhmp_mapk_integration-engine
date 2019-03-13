"use strict";

import { MedicalInstitutions } from "data-platform-schema-definitions";
import log from "../helpers/Logger";
import BaseTransformation from "./BaseTransformation";
import ITransformation from "./ITransformation";

const slug = require("slugify");
const csvtojson = require("csvtojson");
const iconv = require("iconv-lite");

export default class MedicalInstitutionsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = MedicalInstitutions.name;
    }

    /**
     * Overrides BaseTransformation::transform
     */
    public transform = async (data: any|any[]): Promise<any|any[]> => {
        const files = {
            institutions: [],
            openingHours: {},
            types: {},
        };
        await Promise.all(data.map(async (file) => {
            switch (file.name) {
                case "lekarny_seznam":
                    files.institutions = await this.transformFile(file);
                    files.institutions = files.institutions.filter((i) => i.MESTO.indexOf("Praha") !== -1);
                    break;
                case "lekarny_typ":
                    const types = await this.transformFile(file);
                    types.forEach((type) => {
                        files.types[type.TYP_LEKARNY] = type.NAZEV;
                    });
                    break;
                case "lekarny_prac_doba":
                    const hours = await this.transformFile(file);
                    hours.forEach((hour) => {
                        if (hour.OD && hour.DO && hour.OD !== hour.DO) {
                            if (!files.openingHours[hour.KOD_PRACOVISTE]) {
                                files.openingHours[hour.KOD_PRACOVISTE] = [];
                            }
                            files.openingHours[hour.KOD_PRACOVISTE].push({
                                day: this.getDayLabel(hour.DEN),
                                hours: hour.OD + " - " + hour.DO,
                            });
                        }
                    });
                    break;
                default:
                    log.warn("Unknown filename: " + file.name);
                    break;
            }
        }));

        const promises = files.institutions.map(async (institution) => {
            const transformed = await this.transformElement(institution);
            transformed.properties.opening_hours = files.openingHours[transformed.properties.institution_code];
            transformed.properties.type.description = files.types[transformed.properties.type.id];
            return transformed;

        });
        const results = await Promise.all(promises);
        return results.filter((r) => r !== null);
    }

    protected transformElement = async (element: any): Promise<any> => {
        // const geo = await GeocodeApi.getGeoByAddress(element.ULICE.split(",")[0], element.MESTO);
        const res = {
            geometry: {
                coordinates: [0, 0], // WARNING coordinates must be added retroactively
                type: "Point",
            },
            properties: {
                address: {
                    city: element.MESTO,
                    formatted: element.ULICE + ", " + element.PSC + " " + element.MESTO,
                    street: element.ULICE,
                    zip: element.PSC,
                },
                email: (element.EMAIL) ? element.EMAIL.trim().split(",") : [],
                id: slug(element.KOD_PRACOVISTE + "-" + element.NAZEV, {lower: true}),
                institution_code: element.KOD_PRACOVISTE,
                name: element.NAZEV,
                opening_hours: [],
                pharmacy_code: (element.KOD_LEKARNY) ? element.KOD_LEKARNY : null,
                telephone: (element.TELEFON) ? element.TELEFON.trim().split(",") : [],
                timestamp: new Date().getTime(),
                type: {
                    description: null,
                    id: element.TYP_LEKARNY,
                },
                web: (element.WWW) ? element.WWW.trim().split(",") : [],
            },
            type: "Feature",
        };
        return res;
    }

    private transformFile = async (file: any): Promise<any> => {
        return csvtojson({
            delimiter: ";", noheader: false,
        }).fromString(iconv.decode(Buffer.from(file.data, "hex"), "win1250"));
    }

    private getDayLabel = (day: string): string => {
        switch (day) {
            case "PO": return "Pondělí";
            case "UT": return "Úterý";
            case "ST": return "Středa";
            case "CT": return "Čtvrtek";
            case "PA": return "Pátek";
            case "SO": return "Sobota";
            case "NE": return "Neděle";
            case "SVATEK": return "Svátek";
        }
    }
}
