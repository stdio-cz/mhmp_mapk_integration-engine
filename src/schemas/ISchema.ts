"use strict";

export default interface ISchema {

    schemaObject: object;
    Validate(data: object): Promise<boolean>;

}
