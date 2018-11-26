"use strict";

export default interface ITransformation {

    name: string;
    TransformDataElement(element): Promise<any>;
    TransformDataCollection(collection): Promise<any>;

}
