"use strict";

import { SchemaDefinition } from "mongoose";

export default interface ISchema {

    schemaObject: SchemaDefinition;
    Validate(data: object): Promise<boolean>;

}
