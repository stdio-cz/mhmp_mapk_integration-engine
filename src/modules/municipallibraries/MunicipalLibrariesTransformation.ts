"use strict";

import { MunicipalLibraries } from "@golemio/schema-definitions";
import * as moment from "moment-timezone";
import { log } from "../../core/helpers";
import { BaseTransformation, ITransformation } from "../../core/transformations";

interface IOpeningHours {
    closes: string;
    description?: string | null;
    day_of_week: string;
    is_default: boolean;
    opens: string;
}

enum openingHoursDaysKeys {
    pondeli = "Monday",
    utery = "Tuesday",
    streda = "Wednesday",
    ctvrtek = "Thursday",
    patek = "Friday",
    sobota = "Saturday",
    nedele = "Sunday",
}

interface IService {
    id: number;
    name: string;
    description?: string;
}

interface ISection {
    id: string;
    name: string;
    type?: string;
    url?: string;
}

export class MunicipalLibrariesTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = MunicipalLibraries.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        // filter sub-departments
        if (element.nadrazena.trim() !== "") {
            log.debug(`Subdepartment '${element.nazev}' was filtered out.`);
            return null;
        }
        const gps = element.adresa.gps.split(",").map((e: string) => parseFloat(e.trim()));
        // filter departments without gps
        if (gps[0] === 0 || gps[1] === 0) {
            log.debug(`Department '${element.nazev}' was filtered out.`);
            return null;
        }

        const res = {
            geometry: {
                coordinates: [gps[1], gps[0]],
                type: "Point",
            },
            properties: {
                address: {
                    address_country: "Česko",
                    address_formatted: element.adresa.ulice + " " + element.adresa.cislo + ", "
                        + element.adresa.psc + " " + element.adresa.mesto + ", Česko",
                    address_locality: element.adresa.mesto,
                    postal_code: element.adresa.psc,
                    street_address: element.adresa.ulice + " " + element.adresa.cislo,
                },
                email: element.kontakt.email,
                id: parseInt(element.id, 10),
                name: element.nazev,
                opening_hours: (element.oteviracidoby.oteviracidoba instanceof Array)
                    ? element.oteviracidoby.oteviracidoba.flatMap((o: any) => this.transformOpeningHours(o))
                    : this.transformOpeningHours(element.oteviracidoby.oteviracidoba),
                sections_and_departments: (typeof element.oddeleni !== "string")
                    ? (element.oddeleni.oddeleni instanceof Array)
                        ? element.oddeleni.oddeleni.map((o) => this.transformSection(o))
                        : [this.transformSection(element.oddeleni.oddeleni)]
                    : [],
                services: (typeof element.sluzby !== "string")
                    ? (element.sluzby.sluzba instanceof Array)
                        ? element.sluzby.sluzba.map((s) => this.transformService(s))
                        : [this.transformService(element.sluzby.sluzba)]
                    : [],
                telephone: element.kontakt.telefon,
                updated_at: new Date().getTime(),
                web: element.adresa.url,
            },
            type: "Feature",
        };

        return res;
    }

    private transformOpeningHours = (openingHoursObject: any): IOpeningHours[] => {
        const res = [];
        const description = openingHoursObject.nazev;
        const isDefault = openingHoursObject.defaultni;
        let validFrom: string | undefined;
        let validThrough: string | undefined;
        if (openingHoursObject.platnost) {
            if (openingHoursObject.platnost.od) {
                validFrom = moment.tz(openingHoursObject.platnost.od, "Europe/Prague").toISOString();
            }
            if (openingHoursObject.platnost.do) {
                validThrough = moment.tz(openingHoursObject.platnost.do, "Europe/Prague").toISOString();
            }
        }

        Object.keys(openingHoursDaysKeys).forEach((day: string) => {
            if (openingHoursObject[day] && !(typeof openingHoursObject[day] === "string")) {
                if (openingHoursObject[day].rano) {
                    res.push({
                        closes: openingHoursObject[day].rano.do,
                        day_of_week: openingHoursDaysKeys[day],
                        description,
                        is_default: isDefault,
                        opens: openingHoursObject[day].rano.od,
                        valid_from: validFrom,
                        valid_through: validThrough,
                    });
                }
                if (openingHoursObject[day].odpoledne) {
                    res.push({
                        closes: openingHoursObject[day].odpoledne.do,
                        day_of_week: openingHoursDaysKeys[day],
                        description,
                        is_default: isDefault,
                        opens: openingHoursObject[day].odpoledne.od,
                        valid_from: validFrom,
                        valid_through: validThrough,
                    });
                }
            }
        });

        return res;
    }

    private transformService = (serviceObject: any): IService => {
        return {
            description: (serviceObject.popis) ? serviceObject.popis : null,
            id: parseInt(serviceObject.id, 10),
            name: serviceObject.nazev,
        };
    }

    private transformSection = (sectionObject: any): ISection => {
        return {
            id: sectionObject.id,
            name: sectionObject.nazev,
            type: (sectionObject.typ) ? sectionObject.typ : null,
            url: (sectionObject.url) ? sectionObject.url : null,
        };
    }

}
