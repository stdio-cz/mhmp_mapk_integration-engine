"use strict";

import { IceGatewayStreetLamps } from "golemio-schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class IceGatewayStreetLampsTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = IceGatewayStreetLamps.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const states = {
            "-1": "lost connection (connection status older than 1 hour)",
            "-2": "short-circuit (has connection and the last state non \"off\" is \"short\")",
            "-3": "open-circuit/light unplugged (has connection and the last state non \"off\" is \"open\")",
            "0": "no state (has connection and the last state received is older than 3 hours)",
            "1": "light on (has connection and last state is \"on\")",
            "2": "light off (has connection and last state is \"off\", and the previous state non \"off\" is \"on\")",
            "3": "wrong state \"on\" (has connection and the last state is \"on\", "
                + "but according to the calendar or the manual override the light should be \"off\")",
            "4": "wrong state \"off\" According to calendar the light should be \"on\" and the manual_"
                + "override is greater than 0 but the light send status \"off\". When Light change its "
                + "status it sends updated value to server and when accessing current state in this "
                + "very moment this event occurs.",
        };
        const res = {
            geometry: {
                coordinates: [ parseFloat(element.longitude), parseFloat(element.latitude) ],
                type: "Point",
            },
            properties: {
                dim_value: element.dim_value,
                groups: element.groups,
                id: element.ice_id,
                lamppost_id: element.lamppost_id,
                last_dim_override: element.last_dim_override,
                state: {
                    description: states["" + element.state],
                    id: element.state,
                },
                updated_at: new Date().getTime(),
            },
            type: "Feature",
        };
        return res;
    }

}
