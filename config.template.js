module.exports = {
    mongo: {
        url: "localhost:27017",
        username: null,
        password: null,
        db: "dataplatform",
        authdb: null
    },
    amqp: {
        prococol: "amqp",
        hostname: "localhost",
        port: "5672",
        username: null,
        password: null,
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
