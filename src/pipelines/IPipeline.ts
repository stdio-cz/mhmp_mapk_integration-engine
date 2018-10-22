"use strict";

export default interface IPipeline {

    name: string;
    TransformDataElement(element): Promise<any>;
    TransformDataCollection(collection): Promise<any>;

}
