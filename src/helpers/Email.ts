"use strict";

const nodemailer = require("nodemailer");
const config = require("../../config.js");
const log = require("debug")("Email");
const errorLog = require("debug")("error");

export default class Email {

    protected transporter;

    constructor() {
        // Create reusable transporter object using the default SMTP transport
        this.transporter = nodemailer.createTransport({
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
    }

    /**
     * Sends an email.
     *
     * @param {string} to List of receivers separated by a comma
     * @param {string} subject Email subject
     * @param {string} text Email body in plain text
     * @param {string} html Email body in html
     * @param {string} from Sender address
     */
    public send = (
            to: string,
            subject: string,
            text: string = "",
            html: string = "",
            from: string = "no-reply@operatorict.cz"): Promise<any> => {

        return new Promise((resolve, reject) => {
            // Setup email data with unicode symbols
            const mailOptions = {
                from, // sender address
                html, // html body
                subject, // Subject line
                text, // plain text body
                to, // list of receivers
            };

            // Send mail with defined transport object
            log("Sending email.");
            this.transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    errorLog(error);
                    return reject();
                }
                log("Message %s sent: %s", info.messageId, info.response);
                return resolve();
            });
        });
    }

}
