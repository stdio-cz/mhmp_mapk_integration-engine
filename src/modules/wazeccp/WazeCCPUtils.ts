"use strict";

import hash = require("object-hash");

const computeHash = (obj: object): string => hash(obj, { unorderedArrays: true });

const generateAJIUniqueIdentifierHash = (obj: object, rootStartTime: number): string => {
    const objHash = this.computeHash(obj);
    const combinedObject = {
        originalObjectHash: objHash,
        rootTime: rootStartTime,
    };
    return this.computeHash(combinedObject);
};

export { computeHash, generateAJIUniqueIdentifierHash };
