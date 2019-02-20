"use strict";

export default interface ITransformation {

    /** Transformation name */
    name: string;
    /** Transform one single element from input format (from data source) to output format */
    TransformDataElement(element: object): Promise<any>;
    /** Transform the whole collection */
    TransformDataCollection(collection: object[]): Promise<any>;

}
