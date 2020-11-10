"use strict";

import { CustomError } from "@golemio/errors";
import { SortedWasteStations } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

import slug from "slugify";
import * as _ from "underscore";

export class IPRSortedWasteStationsTransformation extends BaseTransformation implements ITransformation {

    public name: string;
    protected containers: any[];

    constructor() {
        super();
        this.name = SortedWasteStations.ipr.name;
    }

    public setContainers = (containers: any[]): void => {
        this.containers = containers;
    }

    /**
     * Overrides BaseTransformation::transform
     */
    public transform = async (stations: any[]): Promise<any[]> => {
        const sortedStations = _.sortBy(stations, (a) => a.properties.ID);
        if (this.containers === undefined || this.containers === null) {
            throw new CustomError("Sorted Waste Containers were not set. Use method setContaners().",
                true, this.constructor.name, 3001);
        }
        const sortedContainers = _.sortBy(this.containers, (a) => a.properties.STATIONID);

        let j = 0;
        const promises = sortedStations.map(async (station) => {
            const result = await this.transformElement(station);
            while (sortedContainers[j]
                && sortedContainers[j].properties.STATIONID === station.properties.ID) {
                result.properties.containers.push({
                    cleaning_frequency: {
                        duration: "P" + Math.floor(sortedContainers[j].properties.CLEANINGFREQUENCYCODE / 10) + "W",
                        frequency: (sortedContainers[j].properties.CLEANINGFREQUENCYCODE % 10),
                        id: sortedContainers[j].properties.CLEANINGFREQUENCYCODE,
                    },
                    container_type: sortedContainers[j].properties.CONTAINERTYPE,
                    trash_type: this.getTrashTypeByString(sortedContainers[j].properties.TRASHTYPENAME),
                });
                j += 1;
            }
            return result;
        });
        const results = await Promise.all(promises);
        return results.filter((r) => r);
    }

    public getTrashTypeByString = (key: string): { id: number, description: string } => {
        switch (key) {
            case "Barevné sklo":
            case "glass_coloured":
            case "sb":
                return { description: "Barevné sklo", id: 1 };
            case "Elektrozařízení":
                return { description: "Elektrozařízení", id: 2 };
            case "Kovy":
            case "metal":
            case "ko":
                return { description: "Kovy", id: 3 };
            case "Nápojové kartóny":
            case "beverage_cartons":
            case "nk":
                return { description: "Nápojové kartóny", id: 4 };
            case "Papír":
            case "paper":
            case "p":
                return { description: "Papír", id: 5 };
            case "Plast":
            case "plastic":
            case "u":
                return { description: "Plast", id: 6 };
            case "Čiré sklo":
            case "glass_white":
            case "sc":
                return { description: "Čiré sklo", id: 7 };
            case "Textil":
                return { description: "Textil", id: 8 };
            default:
                return { description: "neznámý", id: 0 };
        }
    }

    public getAccessibilityByString = (key: string): { id: number, description: string } => {
        switch (key) {
            case "volně":
                return { description: "volně", id: 1 };
            case "obyvatelům domu":
                return { description: "obyvatelům domu", id: 2 };
            default:
                return { description: "neznámá dostupnost", id: 3 };
        }
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            geometry: element.geometry,
            properties: {
                accessibility: this.getAccessibilityByString(element.properties.PRISTUP),
                containers: [],
                id: element.properties.ID,
                name: element.properties.STATIONNAME,
                station_number: element.properties.STATIONNUMBER,
                updated_at: new Date().getTime(),
            },
            type: element.type,
        };
        return res;
    }
}
