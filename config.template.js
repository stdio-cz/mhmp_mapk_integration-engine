module.exports = {
    mongo: {
        url: "mongodb://localhost:27017/dataplatform",
        options: {
            autoReconnect: true,
            bufferMaxEntries: 0, // Don't wait with queries when DB is unavailable
            useNewUrlParser: true,
            // authorization must be set or not filled (cannot be null)
            /*
            auth: {
                authdb: null,
            },
            user: null,
            pass: null,
            */
        },
    },
    amqp: {
        prococol: "amqp",
        hostname: "localhost",
        port: "5672",
        // authorization must be set or not filled (cannot be null)
        /*
        username: null,
        password: null,
        */
    },
    dataSources: {
        TSKParkings: "http://www.tsk-praha.cz/tskexport3/json/parkings"
    },
    refreshTimesInMinutes: {
        Parkings: 5
    },
    mail_service: "smtp.oict.cz",
    mail_port: "25",
    mail_username: "",
    mail_password: "",
    mail_smtp_config: {},
    mail_reciever: "vyvoj@operatorict.cz",
    sparql_endpoint_url: "https://opendata.mojepraha.eu",
    sparql_endpoint_authorization: ""
}
