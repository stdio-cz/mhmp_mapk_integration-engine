module.exports = {
    mongoConnection: "mongodb://user:pass@localhost:27017/dataplatform?authSource=admin",
    amqpConnection: "amqp://user:pass@localhost:5672",
    dataSources: {
        CityDistricts: "http://opendata.iprpraha.cz/CUR/DTMP/TMMESTSKECASTI_P/WGS_84/TMMESTSKECASTI_P.json",
        TSKParkings: "http://www.tsk-praha.cz/tskexport3/json/parkings"
    },
    refreshTimesInMinutes: {
        Parkings: 5
    },
    openStreetMapApiUrl: "https://nominatim.openstreetmap.org/reverse?format=json&accept-language=cs&zoom=18",
    sparqlEndpointUrl: "https://opendata.mojepraha.eu",
    sparqlEndpointAuthorization: ""
}
