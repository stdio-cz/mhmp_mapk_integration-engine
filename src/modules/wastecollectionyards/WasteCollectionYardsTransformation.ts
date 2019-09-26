"use strict";

import { WasteCollectionYards } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

import slug from "slugify";

export class WasteCollectionYardsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = WasteCollectionYards.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            geometry: element.geometry,
            properties: {
                address: {
                    address_formatted: element.properties.ADRESA,
                },
                contact: element.properties.KONTAKT,
                id: slug(element.properties.NAZEV, { lower: true }),
                name: element.properties.NAZEV,
                operating_hours: element.properties.PROVOZNIDOBA,
                operator: element.properties.PROVOZOVATEL,
                properties: [],
                type: element.properties.TYPOBJEKTU,
                updated_at: new Date().getTime(),
            },
            type: "Feature",
        };

        if (element.properties.ODPADPRIJEM) {
            res.properties.properties.push({
                description: "Příjem odpadu",
                id: "ODPADPRIJEM",
                value: element.properties.ODPADPRIJEM,
            });
        }
        if (element.properties.ODPADOMEZENI) {
            res.properties.properties.push({
                description: "Omezení příjmu odpadu",
                id: "ODPADOMEZENI",
                value: element.properties.ODPADOMEZENI,
            });
        }
        if (element.properties.NEBEZPODPADPRIJEM) {
            res.properties.properties.push({
                description: "Příjem nebezpečného odpadu",
                id: "NEBEZPODPADPRIJEM",
                value: element.properties.NEBEZPODPADPRIJEM,
            });
        }
        if (element.properties.ZPETNYODBER) {
            res.properties.properties.push({
                description: "Zpětný odběr odpadu",
                id: "ZPETNYODBER",
                value: element.properties.ZPETNYODBER,
            });
        }
        if (element.properties.PLATBAODPAD) {
            res.properties.properties.push({
                description: "Platba za odpad",
                id: "PLATBAODPAD",
                value: element.properties.PLATBAODPAD,
            });
        }
        if (element.properties.PLATBANEBEZPODPAD) {
            res.properties.properties.push({
                description: "Platba za nebezpečný odpad",
                id: "PLATBANEBEZPODPAD",
                value: element.properties.PLATBANEBEZPODPAD,
            });
        }
        if (element.properties.POZNAMKA) {
            res.properties.properties.push({
                description: "Poznámka",
                id: "POZNAMKA",
                value: element.properties.POZNAMKA,
            });
        }

        return res;
    }

}
