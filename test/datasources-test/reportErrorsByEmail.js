"use strict";

const fs = require("fs");
const nodemailer = require("nodemailer");

const config = {
    mail_from: process.env.MAILER_FROM,
    mail_password: process.env.MAILER_PASSWORD,
    mail_port: process.env.MAILER_PORT,
    mail_reciever: process.env.MAILER_RECEIVER,
    mail_service: process.env.MAILER_HOST,
    mail_username: process.env.MAILER_USERNAME,
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

// to, subject, text = "", html = "", from = "no-replay@operatorict.cz"
const send = (opts, callback) => {
    // options validation
    if (!opts.to || opts.to === "" || !opts.subject || opts.subject === "" || !opts.from || opts.from === "") {
        callback("Mandatory options must be set.");
    }

    // Setup email data with unicode symbols
    const mailOptions = {
        from: opts.from, // sender address
        html: opts.html, // html body
        subject: opts.subject, // Subject line
        text: opts.text, // plain text body
        to: opts.to, // list of receivers
    };

    // Send mail with defined transport object
    console.log("Sending email...");
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return callback(error);
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
        send({
            to: config.mail_reciever,
            subject: "Golemio Integration Engine - datasources test reporting",
            text: data,
            html: "",
            from: config.mail_from || `<${config.mail_username}>`
        } , (error) => {
            if (!error) {
                console.log(`Report was sent by email to ${config.mail_reciever}`);
            } else {
                throw error;
            }
        });
    } else {
        console.log("Tests OK!");
    }
});
