"use strict";

export interface ITransformation {
    /** Transformation name */
    name: string;
    /** Transform the whole collection */
    transform: (collection: any|any[]) => Promise<any|any[]>;

}