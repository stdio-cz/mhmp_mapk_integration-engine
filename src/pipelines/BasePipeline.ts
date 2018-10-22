"use strict";

export default abstract class BasePipeline {

    /** Pipeline name */
    public abstract name: string;
    /** Transform one single element from input format (from data source) to output format */
    public abstract TransformDataElement;
    /** Transform the whole collection */
    public abstract TransformDataCollection;

}
