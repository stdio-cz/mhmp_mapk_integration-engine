"use strict";

import { Playgrounds } from "data-platform-schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class PlaygroundsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = Playgrounds.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            geometry: element.geometry,
            properties: {
                content: element.content,
                id: element.itemId,
                image: {
                    url: (element.image && element.image.originalUrl) ? element.image.originalUrl : null,
                },
                name: element.title.replace(/\d{1,2}\.(\D){0,1} /g, ""),
                perex: (element.perex) ? element.perex : null,
                properties: [],
                timestamp: new Date().getTime(),
                url: element.url,
            },
            type: "Feature",
        };
        if (element.category) {
            const properties = element.category.map(async (cat) => {
                return {
                    id: cat.id,
                    title: cat.nazev,
                };
            });
            res.properties.properties = await Promise.all(properties);
        }
        return res;
    }

}
