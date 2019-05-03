"use strict";

/**
 * Function that reduces object data by path.
 *
 * @param {string} path Specifies where to look for the unique identifier of the object to find it in the data.
 * @param {object} obj Raw data.
 * @returns {object|array} Filtered data.
 */
const getSubProperty = (path: string, obj: any): any => {
    if (path === "") {
        return obj;
    } else {
        return path.split(".").reduce((prev, curr) => {
            return prev ? prev[curr] : undefined;
        }, obj);
    }
};

export { getSubProperty };
