"use strict";

/**
 * Helper class for manipulating with JSON objects.
 */
class JsonUtils {

    /**
     * Function to update a JSON document.
     * Only values present in the updateData will be changed in the toUpdate JSON object.
     * If updateData has some extra values, they will all be added to the toUpdate object.
     *
     * @param {object} toUpdate JSON object, document to be updated
     * @param {object} updateDate JSON object with values to update
     */
    public updateJsonDoc = (toUpdate: object, updateData: object): Promise<any> => {
        return new Promise((resolve, reject) => {
            if (!updateData) {
                return resolve(toUpdate);
            }
            if (!toUpdate) {
                toUpdate = {};
            }

            // Attributes JS Closure
            const attributesIterator = (i, cb) => {
                if (Object.keys(updateData).length === i) {
                    cb();
                    return;
                }
                const key = Object.keys(updateData)[i];
                toUpdate[key] = updateData[key];
                setImmediate(attributesIterator.bind(null, i + 1, cb));
            };

            attributesIterator(0, () => {
                return resolve(toUpdate);
            });
        });
    }
}

export default new JsonUtils();
