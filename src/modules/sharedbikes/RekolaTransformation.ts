"use strict";

import { SharedBikes } from "golemio-schema-definitions";
import { log } from "../../core/helpers";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class RekolaTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = SharedBikes.rekola.name;
    }

    public transform = async (data: any): Promise<any> => {
        return new Promise((resolve, reject) => {
            const results = [];

            // bikes JS Closures
            const bikesIterator = async (i, vehicles, inRack, icb) => {
                if (vehicles.length === i) {
                    return icb();
                }
                if (vehicles[i].isVisible) {
                    vehicles[i].inRack = inRack;
                    results.push(await this.transformElement(vehicles[i]));
                }
                setImmediate(bikesIterator.bind(null, i + 1, vehicles, inRack, icb));
            };

            // racks JS Closure
            const racksIterator = (j, jcb) => {
                if (data.racks.length === j) {
                    return jcb();
                }
                if (data.racks[j].isVisible && data.racks[j].vehicles !== undefined
                        && data.racks[j].vehicles.length !== 0) {
                    bikesIterator(0, data.racks[j].vehicles, true, () => {
                        setImmediate(racksIterator.bind(null, j + 1, jcb));
                    });
                } else {
                    setImmediate(racksIterator.bind(null, j + 1, jcb));
                }
            };

            bikesIterator(0, data.vehicles, false, () => {
                racksIterator(0, () => {
                    resolve(results);
                });
            });
        });
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            geometry: {
                coordinates: [ parseFloat(element.position.lng), parseFloat(element.position.lat) ],
                type: "Point",
            },
            properties: {
                company: {
                    name: "Rekola",
                    web: "www.rekola.cz",
                },
                id: "rekola-" + element.id,
                in_rack: (element.inRack) ? element.inRack : false,
                label: (element.label) ? element.label : "",
                location_note: (element.positionNote) ? element.positionNote : null,
                name: element.name,
                res_url: "https://app.rekola.cz/",
                type: this.getType(element.type),
                updated_at: new Date().getTime(),
            },
            type: "Feature",
        };
        return res;
    }

    private getType = (id: string): {description: string, id: number} => {
        switch (id) {
            case "bike": return { description: "bike", id: 1 };
            case "e-bike": return { description: "ebike", id: 2 };
            case "scooter": return { description: "scooter", id: 3 };
            default:
                log.warn("Undefined Rekola type: " + id);
                return { description: "bike", id: 1 };
        }
    }

}
