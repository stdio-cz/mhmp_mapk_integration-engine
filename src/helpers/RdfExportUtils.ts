"use strict";

import log from "./Logger";

const fs = require("fs");
const request = require("request");
const config = require("../config/ConfigLoader");

/**
 * TODO refaktoring, neukladat do filesystemu
 *
 * Helper class for RDF export.
 */
class RdfExportUtils {

    /**
     * Uploads new RDF dataset by Fuseki API
     * POST /[dataset-name]/data
     */
    public UploadRdfDatasetToEndpoint = (files) => {
        log.debug("Uploading RDF files...");

        const options = {
            formData: {
                "file[]": null,
            },
            headers: {
                "authorization": config.SPARQL_ENDPOINT_AUTH,
                "cache-control": "no-cache",
                "content-type": "multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW",
            },
            method: "POST",
            url: null,
        };
        // uploading each dataset
        const promises = files.map((file) => {
            return new Promise((resolve, reject) => {
                this.deleteRdfDatasetFromEndpoint(file.name).then(() => {
                    options.url = config.SPARQL_ENDPOINT_URL + "/" + file.name + "/data";
                    options.formData["file[]"] = [{
                        options: {
                            contentType: "text/turtle",
                            filename: file.name + ".ttl",
                        },
                        value: fs.createReadStream(file.dataset),
                    }];
                    // sending to server
                    request(options, (error, response, body) => {
                        if (!error && response.statusCode === 200) {
                            log.debug(file.name + " dataset successfully uploaded to endpoint.");
                            resolve({ file: file.name, result: JSON.parse(body) });
                        } else {
                            log.error(response.statusCode);
                            reject(error || response.statusCode);
                        }
                    });
                });
            });
        });
        // uploading all datasets to `live`
        Promise.all(promises).then((eachDatasetResult) => {
            options.url = config.SPARQL_ENDPOINT_URL + "/live/data";
            options.formData["file[]"] = [];
            for (let i = 0, iMax = files.length; i < iMax; i++) {
                options.formData["file[]"].push({
                    options: {
                        contentType: "text/turtle",
                        filename: files[i].name + ".ttl",
                    },
                    value: fs.createReadStream(files[i].dataset),
                });
            }
            this.deleteRdfDatasetFromEndpoint("live").then(() => {
                // sending to server
                request(options, (error, response, body) => {
                    if (!error && response.statusCode === 200) {
                        log.debug("All datasets successfully uploaded to endpoint.");
                        this.generateVoidFile(eachDatasetResult);
                    } else {
                        log.error(error || response.statusCode);
                    }
                });
            });

        }).catch((err) => {
            log.error(err);
        });
    }

    /**
     * Saves new Void dataset and uploads it by Fuseki API
     * POST /metadata/data
     */
    protected generateVoidFile = (results) => {
        log.debug("Generating void dataset...");

        const text = "\n"
            + "\n"
            + "@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n"
            + "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n"
            + "@prefix foaf: <http://xmlns.com/foaf/0.1/> .\n"
            + "@prefix owl: <http://www.w3.org/2002/07/owl#> .\n"
            + "@prefix dcterms: <http://purl.org/dc/terms/> .\n"
            + "@prefix schema: <http://schema.org/> .\n"
            + "@prefix void: <http://rdfs.org/ns/void#> .\n"
            + "@prefix oict: <http://operatorict.cz/ontology#> .\n"
            + "@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n"
            + "\n"
            + "oict:benak a schema:Person ;\n"
            + "    schema:givenName \"Tomáš\"@cs ;\n"
            + "    schema:familyName \"Benák\"@cs ;\n"
            + "    schema:email \"benak@operatorict.cz\" ;\n"
            + "    schema:telephone \"+420 770 139 815\" .\n"
            + "\n"
            + "oict:vycpalek a schema:Person ;\n"
            + "    schema:givenName \"Jiří\"@cs ;\n"
            + "    schema:familyName \"Vycpálek\"@cs ;\n"
            + "    schema:email \"vycpalek@operatorict.cz\" ;\n"
            + "    schema:telephone \"+420 770 141 551\" .\n"
            + "\n"
            + "<https://opendata.mojepraha.eu/metadata> a void:DatasetDescription ;\n"
            + "    dcterms:title \"A VoID Description of the MojePraha Dataset\"@en ;\n"
            + "    dcterms:title \"VoID popis datasetu MojePraha\"@cs ;\n"
            + "    dcterms:creator\n"
            + "        oict:benak ,\n"
            + "        oict:vycpalek ;\n"
            + "    foaf:primaryTopic oict:mojepraha ;\n"
            + "    foaf:topic \n"
            + "        oict:city-districts ,\n"
            + "        oict:gardens ,\n"
            + "        oict:medical-institutions ,\n"
            + "        oict:municipal-authorities ,\n"
            + "        oict:municipal-libraries ,\n"
            + "        oict:playgrounds ,\n"
            + "        oict:municipal-police-stations ,\n"
            + "        oict:public-toilets ,\n"
            + "        oict:waste-collection-yards .\n"
            + "\n"
            + "oict:mojepraha a void:Dataset ;\n"
            + "    dcterms:title \"Linked Open Data mobilní aplikace Moje Praha\"@cs ;\n"
            + "    dcterms:description \"Moje Praha je nová aplikace Hlavního města Prahy, která vzniká "
            + "v rámci společnosti Operátor ICT ve spolupráci s Prague Startup Center a slouží k poskytnutí "
            + "dat občanům Prahy.\"@cs ;\n"
            + "    foaf:homepage <https://www.mojepraha.eu> ;\n"
            + "    dcterms:creator\n"
            + "        oict:benak ,\n"
            + "        oict:vycpalek ;\n"
            + "    dcterms:created \"2017-11-01\"^^xsd:date ;\n"
            + "    dcterms:modified \"" + new Date().toISOString().split("T")[0] + "\"^^xsd:date ;\n"
            + "    void:subset\n"
            + "        oict:city-districts ,\n"
            + "        oict:gardens ,\n"
            + "        oict:medical-institutions ,\n"
            + "        oict:municipal-authorities ,\n"
            + "        oict:municipal-libraries ,\n"
            + "        oict:playgrounds ,\n"
            + "        oict:municipal-police-stations ,\n"
            + "        oict:public-toilets ,\n"
            + "        oict:waste-collection-yards ;\n"
            + "    void:triples " + results.reduce((a, c) => a + parseInt(c.result.tripleCount, 10), 0) + " ;\n"
            + "    dcterms:license <http://creativecommons.org/licenses/by-nc-sa/3.0/> ;\n"
            + "    void:sparqlEndpoint <http://opendata.mojepraha.eu/live/query> .\n"
            + "\n"
            + "oict:city-districts a void:Dataset ;\n"
            + "    dcterms:title \"Městské části\"@cs ;\n"
            + "    dcterms:description \"57 městských částí v Praze.\"@cs ;\n"
            + "    dcterms:creator\n"
            + "        oict:benak ,\n"
            + "        oict:vycpalek ;\n"
            + "    dcterms:created \"2017-11-01\"^^xsd:date ;\n"
            + "    dcterms:modified \"" + new Date().toISOString().split("T")[0] + "\"^^xsd:date ;\n"
            + "    dcterms:license <http://creativecommons.org/licenses/by-nc-sa/3.0/> ;\n"
            + "    void:feature <http://www.w3.org/ns/formats/Turtle> ;\n"
            + "    void:triples " +
            + results.reduce((a, c) => (c.file === "city-districts") ? a + c.result.tripleCount : a + 0, 0)
            + " ;\n"
            + "    void:dataDump <https://api.mojepraha.eu/city-districts?format=text/turtle> ;\n"
            + "    void:sparqlEndpoint <http://opendata.mojepraha.eu/city-districts/query> ;\n"
            + "    void:inDataset oict:mojepraha .\n"
            + "\n"
            + "oict:gardens a void:Dataset ;\n"
            + "    dcterms:title \"Parky\"@cs ;\n"
            + "    dcterms:description \"Pražské zahrady, parky a zelené plochy.\"@cs ;\n"
            + "    dcterms:creator\n"
            + "        oict:benak ,\n"
            + "        oict:vycpalek ;\n"
            + "    dcterms:created \"2017-11-01\"^^xsd:date ;\n"
            + "    dcterms:modified \"" + new Date().toISOString().split("T")[0] + "\"^^xsd:date ;\n"
            + "    dcterms:license <http://creativecommons.org/licenses/by-nc-sa/3.0/> ;\n"
            + "    void:feature <http://www.w3.org/ns/formats/Turtle> ;\n"
            + "    void:triples " +
            + results.reduce((a, c) => (c.file === "gardens") ? a + c.result.tripleCount : a + 0, 0)
            + " ;\n"
            + "    void:dataDump <https://api.mojepraha.eu/gardens?format=text/turtle> ;\n"
            + "    void:sparqlEndpoint <http://opendata.mojepraha.eu/gardens/query> ;\n"
            + "    void:inDataset oict:mojepraha ;\n"
            + "    void:subset oict:gardens-links .\n"
            + "\n"
            + "oict:medical-institutions a void:Dataset ;\n"
            + "    dcterms:title \"Zdravotnická zařízení\"@cs ;\n"
            + "    dcterms:description \"Pražské lékárny, nemocnice, polikliniky a další lékařská zařízení.\"@cs ;\n"
            + "    dcterms:creator\n"
            + "        oict:benak ,\n"
            + "        oict:vycpalek ;\n"
            + "    dcterms:created \"2017-11-01\"^^xsd:date ;\n"
            + "    dcterms:modified \"" + new Date().toISOString().split("T")[0] + "\"^^xsd:date ;\n"
            + "    dcterms:license <http://creativecommons.org/licenses/by-nc-sa/3.0/> ;\n"
            + "    void:feature <http://www.w3.org/ns/formats/Turtle> ;\n"
            + "    void:triples " +
            + results.reduce((a, c) => (c.file === "medical-institutions") ? a + c.result.tripleCount : a + 0, 0)
            + " ;\n"
            + "    void:dataDump <https://api.mojepraha.eu/medical-institutions?format=text/turtle> ;\n"
            + "    void:sparqlEndpoint <http://opendata.mojepraha.eu/medical-institutions/query> ;\n"
            + "    void:inDataset oict:mojepraha ;\n"
            + "    void:subset oict:medical-institutions-links .\n"
            + "\n"
            + "oict:municipal-authorities a void:Dataset ;\n"
            + "    dcterms:title \"Městské úřady\"@cs ;\n"
            + "    dcterms:description \"Pražské městské úřady a jejich agendy.\"@cs ;\n"
            + "    dcterms:creator\n"
            + "        oict:benak ,\n"
            + "        oict:vycpalek ;\n"
            + "    dcterms:created \"2017-11-01\"^^xsd:date ;\n"
            + "    dcterms:modified \"" + new Date().toISOString().split("T")[0] + "\"^^xsd:date ;\n"
            + "    dcterms:license <http://creativecommons.org/licenses/by-nc-sa/3.0/> ;\n"
            + "    void:feature <http://www.w3.org/ns/formats/Turtle> ;\n"
            + "    void:triples " +
            + results.reduce((a, c) => (c.file === "municipal-authorities") ? a + c.result.tripleCount : a + 0, 0)
            + " ;\n"
            + "    void:dataDump <https://api.mojepraha.eu/municipal-authorities?format=text/turtle> ;\n"
            + "    void:sparqlEndpoint <http://opendata.mojepraha.eu/municipal-authorities/query> ;\n"
            + "    void:inDataset oict:mojepraha ;\n"
            + "    void:subset oict:municipal-authorities-links .\n"
            + "\n"
            + "oict:municipal-libraries a void:Dataset ;\n"
            + "    dcterms:title \"Městské knihovny\"@cs ;\n"
            + "    dcterms:description \"Pražské městské knihovny a jejich služby a zaměření.\"@cs ;\n"
            + "    dcterms:creator\n"
            + "        oict:benak ,\n"
            + "        oict:vycpalek ;\n"
            + "    dcterms:created \"2018-04-18\"^^xsd:date ;\n"
            + "    dcterms:modified \"" + new Date().toISOString().split("T")[0] + "\"^^xsd:date ;\n"
            + "    dcterms:license <http://creativecommons.org/licenses/by-nc-sa/3.0/> ;\n"
            + "    void:feature <http://www.w3.org/ns/formats/Turtle> ;\n"
            + "    void:triples " +
            + results.reduce((a, c) => (c.file === "municipal-libraries") ? a + c.result.tripleCount : a + 0, 0)
            + " ;\n"
            + "    void:dataDump <https://api.mojepraha.eu/municipal-libraries?format=text/turtle> ;\n"
            + "    void:sparqlEndpoint <http://opendata.mojepraha.eu/municipal-libraries/query> ;\n"
            + "    void:inDataset oict:mojepraha ;\n"
            + "    void:subset oict:municipal-libraries-links .\n"
            + "\n"
            + "oict:playgrounds a void:Dataset ;\n"
            + "    dcterms:title \"Dětská hřiště\"@cs ;\n"
            + "    dcterms:description \"Pražská dětská hřiště.\"@cs ;\n"
            + "    foaf:homepage <http://www.hristepraha.cz> ;\n"
            + "    dcterms:creator\n"
            + "        oict:benak ,\n"
            + "        oict:vycpalek ;\n"
            + "    dcterms:created \"2017-11-01\"^^xsd:date ;\n"
            + "    dcterms:modified \"" + new Date().toISOString().split("T")[0] + "\"^^xsd:date ;\n"
            + "    dcterms:license <http://creativecommons.org/licenses/by-nc-sa/3.0/> ;\n"
            + "    void:feature <http://www.w3.org/ns/formats/Turtle> ;\n"
            + "    void:triples " +
            + results.reduce((a, c) => (c.file === "playgrounds") ? a + c.result.tripleCount : a + 0, 0)
            + " ;\n"
            + "    void:dataDump <https://api.mojepraha.eu/playgrounds?format=text/turtle> ;\n"
            + "    void:sparqlEndpoint <http://opendata.mojepraha.eu/playgrounds/query> ;\n"
            + "    void:inDataset oict:mojepraha ;\n"
            + "    void:subset oict:playgrounds-links .\n"
            + "\n"
            + "oict:municipal-police-stations a void:Dataset ;\n"
            + "    dcterms:title \"Městská policie\"@cs ;\n"
            + "    dcterms:description \"Služebny pražské městské policie.\"@cs ;\n"
            + "    dcterms:creator\n"
            + "        oict:benak ,\n"
            + "        oict:vycpalek ;\n"
            + "    dcterms:created \"2018-04-19\"^^xsd:date ;\n"
            + "    dcterms:modified \"" + new Date().toISOString().split("T")[0] + "\"^^xsd:date ;\n"
            + "    dcterms:license <http://creativecommons.org/licenses/by-nc-sa/3.0/> ;\n"
            + "    void:feature <http://www.w3.org/ns/formats/Turtle> ;\n"
            + "    void:triples " +
            + results.reduce((a, c) => (c.file === "municipal-police-stations") ? a + c.result.tripleCount : a + 0, 0)
            + " ;\n"
            + "    void:dataDump <https://api.mojepraha.eu/municipal-police-stations?format=text/turtle> ;\n"
            + "    void:sparqlEndpoint <http://opendata.mojepraha.eu/municipal-police-stations/query> ;\n"
            + "    void:inDataset oict:mojepraha ;\n"
            + "    void:subset oict:municipal-police-stations-links .\n"
            + "\n"
            + "oict:public-toilets a void:Dataset ;\n"
            + "    dcterms:title \"Veřejné toalety\"@cs ;\n"
            + "    dcterms:description \"Pražské veřejné toalety.\"@cs ;\n"
            + "    dcterms:creator\n"
            + "        oict:benak ,\n"
            + "        oict:vycpalek ;\n"
            + "    dcterms:created \"2018-04-19\"^^xsd:date ;\n"
            + "    dcterms:modified \"" + new Date().toISOString().split("T")[0] + "\"^^xsd:date ;\n"
            + "    dcterms:license <http://creativecommons.org/licenses/by-nc-sa/3.0/> ;\n"
            + "    void:feature <http://www.w3.org/ns/formats/Turtle> ;\n"
            + "    void:triples " +
            + results.reduce((a, c) => (c.file === "public-toilets") ? a + c.result.tripleCount : a + 0, 0)
            + " ;\n"
            + "    void:dataDump <https://api.mojepraha.eu/public-toilets?format=text/turtle> ;\n"
            + "    void:sparqlEndpoint <http://opendata.mojepraha.eu/public-toilets/query> ;\n"
            + "    void:inDataset oict:mojepraha ;\n"
            + "    void:subset oict:public-toilets-links .\n"
            + "\n"
            + "oict:waste-collection-yards a void:Dataset ;\n"
            + "    dcterms:title \"Sběrné dvory\"@cs ;\n"
            + "    dcterms:description \"Pražské sběrné dvory.\"@cs ;\n"
            + "    dcterms:creator\n"
            + "        oict:benak ,\n"
            + "        oict:vycpalek ;\n"
            + "    dcterms:created \"2018-04-19\"^^xsd:date ;\n"
            + "    dcterms:modified \"" + new Date().toISOString().split("T")[0] + "\"^^xsd:date ;\n"
            + "    dcterms:license <http://creativecommons.org/licenses/by-nc-sa/3.0/> ;\n"
            + "    void:feature <http://www.w3.org/ns/formats/Turtle> ;\n"
            + "    void:triples " +
            + results.reduce((a, c) => (c.file === "waste-collection-yards") ? a + c.result.tripleCount : a + 0, 0)
            + " ;\n"
            + "    void:dataDump <https://api.mojepraha.eu/waste-collection-yards?format=text/turtle> ;\n"
            + "    void:sparqlEndpoint <http://opendata.mojepraha.eu/waste-collection-yards/query> ;\n"
            + "    void:inDataset oict:mojepraha ;\n"
            + "    void:subset oict:waste-collection-yards-links .\n"
            + "\n"
            + "oict:garden-links a void:Linkset ;\n"
            + "    void:subjectsTarget oict:gardens ;\n"
            + "    void:objectsTarget oict:city-districts ;\n"
            + "    void:linkPredicate schema:containedInPlace .\n"
            + "\n"
            + "oict:medical-institutions-links a void:Linkset ;\n"
            + "    void:subjectsTarget oict:medical-institutions ;\n"
            + "    void:objectsTarget oict:city-districts ;\n"
            + "    void:linkPredicate schema:containedInPlace .\n"
            + "\n"
            + "oict:municipal-authorities-links a void:Linkset ;\n"
            + "    void:subjectsTarget oict:municipal-authorities ;\n"
            + "    void:objectsTarget oict:city-districts ;\n"
            + "    void:linkPredicate schema:containedInPlace .\n"
            + "\n"
            + "oict:municipal-libraries-links a void:Linkset ;\n"
            + "    void:subjectsTarget oict:municipal-libraries ;\n"
            + "    void:objectsTarget oict:city-districts ;\n"
            + "    void:linkPredicate schema:containedInPlace .\n"
            + "\n"
            + "oict:playgrounds-links a void:Linkset ;\n"
            + "    void:subjectsTarget oict:playgrounds ;\n"
            + "    void:objectsTarget oict:city-districts ;\n"
            + "    void:linkPredicate schema:containedInPlace .\n"
            + "\n"
            + "oict:municipal-police-stations-links a void:Linkset ;\n"
            + "    void:subjectsTarget oict:municipal-police-stations ;\n"
            + "    void:objectsTarget oict:city-districts ;\n"
            + "    void:linkPredicate schema:containedInPlace .\n"
            + "\n"
            + "oict:public-toilets-links a void:Linkset ;\n"
            + "    void:subjectsTarget oict:public-toilets ;\n"
            + "    void:objectsTarget oict:city-districts ;\n"
            + "    void:linkPredicate schema:containedInPlace .\n"
            + "\n"
            + "oict:waste-collection-yards-links a void:Linkset ;\n"
            + "    void:subjectsTarget oict:waste-collection-yards ;\n"
            + "    void:objectsTarget oict:city-districts ;\n"
            + "    void:linkPredicate schema:containedInPlace .\n"
            + "\n";

        // saving the dataset to /tmp
        fs.writeFile("/tmp/void.ttl", text, () => {
            const options = {
                formData: {
                    "file[]": {
                        options: {
                            contentType: "text/turtle",
                            filename: "void.ttl",
                        },
                        value: fs.createReadStream("/tmp/void.ttl"),
                    },
                },
                headers: {
                    "authorization": config.SPARQL_ENDPOINT_AUTH,
                    "cache-control": "no-cache",
                    "content-type": "multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW",
                },
                method: "POST",
                url: config.SPARQL_ENDPOINT_URL + "/metadata/data",
            };
            // delete old dataset
            this.deleteRdfDatasetFromEndpoint("metadata")
                .then(() => {
                    // sending new dataset to server
                    request(options, (error, response, body) => {
                        if (!error && response.statusCode === 200) {
                            log.debug("Void dataset successfully uploaded to endpoint.");
                        } else {
                            log.error(error || response.statusCode);
                        }
                    });
                });
        });
    }

    /**
     * Removes old RDF datasets by Fuseki API
     * DELETE /[dataset-name]
     */
    protected deleteRdfDatasetFromEndpoint = (name) => {
        const options = {
            formData: {},
            headers: {
                "authorization": config.SPARQL_ENDPOINT_AUTH,
                "cache-control": "no-cache",
                "content-type": "multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW",
            },
            method: "DELETE",
            qs: { default: "" },
            url: config.SPARQL_ENDPOINT_URL + "/" + name,
        };
        return new Promise((resolve, reject) => {
            request(options, (error, response, body) => {
                if (error) {
                    log.error(error);
                    reject(error);
                } else {
                    log.debug(name + " dataset successfully cleared.");
                    resolve();
                }
            });
        });
    }

}

export default new RdfExportUtils();
