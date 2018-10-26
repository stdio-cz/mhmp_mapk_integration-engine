module.exports = {
    mongo_connection: "mongodb://user:pass@localhost:27017/dataplatform?authSource=admin",
    amqp_connection: "amqp://user:pass@localhost:5672",
    dataSources: {
        TSKParkings: "http://www.tsk-praha.cz/tskexport3/json/parkings"
    },
    refreshTimesInMinutes: {
        Parkings: 5
    },
    sparql_endpoint_url: "https://opendata.mojepraha.eu",
    sparql_endpoint_authorization: ""
}
