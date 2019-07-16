"use strict";

const fs = require("fs");
const nodemailer = require("nodemailer");

const config = {
    mail_password: process.env.MAIL_PASSWORD,
    mail_port: process.env.MAIL_PORT,
    mail_reciever: process.env.MAIL_RECEIVER,
    mail_service: process.env.MAIL_SERVICE,
    mail_username: process.env.MAIL_USERNAME,
};

const transporter = nodemailer.createTransport({
    auth: {
        pass: config.mail_password,
        user: config.mail_username,
    },
    host: config.mail_service,
    port: config.mail_port,
    secure: false, // secure:true for port 465, secure:false for port 587
    tls: {
        rejectUnauthorized: false,
    },
});

const send = (to, subject, text = "", html = "", from = "no-replay@operatorict.cz", callback) => {
    // Setup email data with unicode symbols
    const mailOptions = {
        from, // sender address
        html, // html body
        subject, // Subject line
        text, // plain text body
        to, // list of receivers
    };

    // Send mail with defined transport object
    console.log("Sending email...");
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            callback();
            return console.log(error);
        }
        console.log("Message %s sent: %s", info.messageId, info.response);
        callback();
    });
}

fs.readFile(`${__dirname}/report.txt`, "utf8", (err, data) => {
    if (err) {
        throw err;
    }
    if (data.indexOf("failing") !== -1) {
        send(config.mail_reciever, "Golemio Integration Engine - datasources test reporting", data, "", `<${config.mail_username}>`, () => {
            console.log(`Report was sent by email to ${config.mail_reciever}`);
        });
    } else {
        console.log("Tests OK!");
    }
});
