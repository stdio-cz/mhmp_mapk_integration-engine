"use strict";

import { MOS } from "@golemio/schema-definitions";
import { BaseTransformation, ITransformation } from "../../core/transformations";

export class MosBETokensTransformation extends BaseTransformation implements ITransformation {

    public name: string;

    constructor() {
        super();
        this.name = MOS.BE.tokens.name;
    }

    protected transformElement = async (element: any): Promise<any> => {
        const res = {
            created: element.Created,
            identifier_type: element.IdentifierType,
            token_id: element.TokenID,
        };
        return res;
    }

}
