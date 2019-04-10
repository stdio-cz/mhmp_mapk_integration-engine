"use strict";

import { WasteCollectionYards } from "golemio-schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

const slug = require("slugify");

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
                address: element.properties.ADRESA,
                contact: element.properties.KONTAKT,
                id: slug(element.properties.NAZEV, { lower: true }),
                name: element.properties.NAZEV,
                operating_hours: element.properties.PROVOZNIDOBA,
                operator: element.properties.PROVOZOVATEL,
                properties: [],
                timestamp: new Date().getTime(),
                type: element.properties.TYPOBJEKTU,
            },
            type: "Feature",
        };

        if (element.properties.ODPADPRIJEM) {
            res.properties.properties.push({
                description: "Příjem odpadu",
                key: "ODPADPRIJEM",
                value: element.properties.ODPADPRIJEM,
            });
        }
        if (element.properties.ODPADOMEZENI) {
            res.properties.properties.push({
                description: "Omezení příjmu odpadu",
                key: "ODPADOMEZENI",
                value: element.properties.ODPADOMEZENI,
            });
        }
        if (element.properties.NEBEZPODPADPRIJEM) {
            res.properties.properties.push({
                description: "Příjem nebezpečného odpadu",
                key: "NEBEZPODPADPRIJEM",
                value: element.properties.NEBEZPODPADPRIJEM,
            });
        }
        if (element.properties.ZPETNYODBER) {
            res.properties.properties.push({
                description: "Zpětný odběr odpadu",
                key: "ZPETNYODBER",
                value: element.properties.ZPETNYODBER,
            });
        }
        if (element.properties.PLATBAODPAD) {
            res.properties.properties.push({
                description: "Platba za odpad",
                key: "PLATBAODPAD",
                value: element.properties.PLATBAODPAD,
            });
        }
        if (element.properties.PLATBANEBEZPODPAD) {
            res.properties.properties.push({
                description: "Platba za nebezpečný odpad",
                key: "PLATBANEBEZPODPAD",
                value: element.properties.PLATBANEBEZPODPAD,
            });
        }
        if (element.properties.POZNAMKA) {
            res.properties.properties.push({
                description: "Poznámka",
                key: "POZNAMKA",
                value: element.properties.POZNAMKA,
            });
        }

        return res;
    }

}
